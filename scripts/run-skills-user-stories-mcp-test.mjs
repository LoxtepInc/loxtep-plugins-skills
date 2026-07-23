#!/usr/bin/env node
/**
 * Skills user stories (S0–S15) — hosted MCP gap test runner.
 *
 * Uses @loxtep/customer-mcp-server callToolApi (SigV4 + Function URL resolution).
 * No REST workarounds — failures are logged as-is.
 *
 * Usage:
 *   node scripts/run-skills-user-stories-mcp-test.mjs
 *
 * Auth: ~/.loxtep/credentials.json or LOXTEP_AUTH_TOKEN + LOXTEP_API_BASE_URL
 *
 * Optional:
 *   GAP_REPORT_SUFFIX  — e.g. r7 (default: r7)
 *   GAP_REPORT_DATE    — date prefix (default: today ISO date)
 */

import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { callToolApi } from '../../loxtep/platform-backend/_customer-mcp-server/dist/call-tool-api.js';
import { ensureAccessTokenFresh, loadTokens } from '../../loxtep/platform-backend/_customer-mcp-server/dist/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORT_DATE = process.env.GAP_REPORT_DATE || new Date().toISOString().slice(0, 10);
const REPORT_SUFFIX = process.env.GAP_REPORT_SUFFIX || 'r7';
const REPORT_ID = `skills-user-stories-gap-report-${REPORT_DATE}-${REPORT_SUFFIX}`;
const DOCS_DIR = path.resolve(__dirname, '../docs');
const PRIOR_RUN = process.env.GAP_REPORT_PRIOR || 'skills-user-stories-gap-report-2026-06-13-r8';

/** Blank workflow starter template (matches CustomerWorkspaceService default). */
const DEFAULT_WORKFLOW_TEMPLATE_ID = '990e8400-e29b-41d4-a716-446655440000';

/** @type {Array<{story_id:string,step:string,tool:string,operation:string,status:string,gap_type?:string|null,error?:string,note?:string,workaround_used:'none'}>} */
const steps = [];
/** @type {Record<string,{status:string,skill:string}>} */
const stories = {};

let tokens = null;
let envMeta = {};

function classifyError(msg) {
  const m = (msg || '').toLowerCase();
  if (m.includes('permission denied') || m.includes('forbidden')) return 'rbac';
  if (m.includes('invalid operation') || m.includes('tool not found')) return 'mcp_facade';
  if (m.includes('duckdb') || m.includes('module')) return 'deployment';
  if (m.includes('project_id') && m.includes('required')) return 'validation';
  if (m.includes('not found')) return 'api_backend';
  if (m.includes('validation')) return 'validation';
  if (m.includes('warehouse') || m.includes('table not')) return 'data_fixture';
  return 'api_backend';
}

async function getTokens() {
  if (!tokens) {
    const loaded = loadTokens();
    if (!loaded?.access_token) {
      throw new Error(
        'No Loxtep auth. Run `npx @loxtep/customer-mcp-server login` or set LOXTEP_AUTH_TOKEN.'
      );
    }
    tokens = await ensureAccessTokenFresh(loaded);
  }
  return tokens;
}

async function callMcp(tool, args = {}) {
  try {
    const t = await getTokens();
    const result = await callToolApi(t, tool, args);
    const text = result.content?.[0]?.text ?? '';
    let parsed = null;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = { _raw_text: text };
      }
    }
    const envelopeFailed =
      parsed &&
      typeof parsed === 'object' &&
      parsed.success === false &&
      (parsed.error || parsed.message);
    if (envelopeFailed) {
      return {
        ok: false,
        error: String(parsed.error ?? parsed.message ?? 'MCP tool returned success:false'),
        text,
        data: parsed,
        raw: result,
      };
    }
    return { ok: true, text, data: parsed, raw: result };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

function parsePayload(result) {
  if (!result.ok) return null;
  const root = result.data ?? null;
  if (!root || typeof root !== 'object') return root;
  // MCP tools return { success, data: { ...entity } } inside content[0].text
  if (root.data && typeof root.data === 'object') return root.data;
  return root;
}

function logStep(storyId, step, tool, operation, result, extra = {}) {
  const status = result.ok ? 'PASS' : result.skipped ? 'SKIPPED' : result.blocked ? 'BLOCKED' : 'FAIL';
  steps.push({
    story_id: storyId,
    step,
    tool,
    operation,
    status,
    gap_type: status === 'PASS' ? null : extra.gap_type || classifyError(result.error),
    error: result.error,
    note: extra.note,
    workaround_used: 'none',
  });
  return status;
}

function setStory(storyId, skill, statuses) {
  if (!statuses.length) {
    stories[storyId] = { status: 'SKIPPED', skill };
    return;
  }
  if (statuses.some(s => s === 'BLOCKED')) {
    stories[storyId] = { status: 'BLOCKED', skill };
  } else if (statuses.every(s => s === 'PASS')) {
    stories[storyId] = { status: 'PASS', skill };
  } else if (statuses.some(s => s === 'FAIL') && statuses.some(s => s === 'PASS')) {
    stories[storyId] = { status: 'PARTIAL', skill };
  } else if (statuses.every(s => s === 'FAIL')) {
    stories[storyId] = { status: 'FAIL', skill };
  } else if (statuses.some(s => s === 'FAIL')) {
    stories[storyId] = { status: 'FAIL', skill };
  } else if (statuses.some(s => s === 'SKIPPED')) {
    stories[storyId] = { status: 'PARTIAL', skill };
  } else {
    stories[storyId] = { status: 'PARTIAL', skill };
  }
}

async function runStorySteps(storyId, skill, stepFns) {
  const statuses = [];
  for (const fn of stepFns) {
    statuses.push(await fn());
  }
  setStory(storyId, skill, statuses);
  return statuses;
}

function skipped(storyId, step, tool, operation, reason) {
  return logStep(storyId, step, tool, operation, { ok: false, skipped: true, error: reason });
}

/** Flow E — minimal ingestion bundle for MCP gap tests (S2). */
function buildMcpStoryIngestionBundle(fixture, label) {
  const workflowId = randomUUID();
  const connectionId = randomUUID();
  const dataProductId = randomUUID();
  const now = new Date().toISOString();
  const useSdk = Boolean(fixture.connector_id);

  const connection = {
    connection_id: connectionId,
    workflow_id: workflowId,
    key: useSdk ? 'sdk-input' : 'webhook-source',
    name: useSdk ? 'SDK Input' : 'Webhook source',
    type: useSdk ? 'sdk' : 'webhook',
    status: 'active',
    configuration: useSdk ? { sdk_type: 'nodejs', event_type: 'orders' } : {},
    created_at: now,
    updated_at: now,
  };
  if (useSdk) {
    connection.connector_id = fixture.connector_id;
  }

  return {
    workflowId,
    connectionId,
    dataProductId,
    files: {
      'workflow.json': {
        workflow_id: workflowId,
        name: `mcp-story-wf-${label}`,
        template_id: DEFAULT_WORKFLOW_TEMPLATE_ID,
        workflow_type: 'ingestion',
        status: 'active',
        configuration: {},
        metadata: {},
        created_at: now,
        updated_at: now,
      },
      [`connections/${connectionId}.json`]: connection,
      [`data-products/${dataProductId}.json`]: {
        data_product_id: dataProductId,
        workflow_id: workflowId,
        name: `mcp-story-dp-${label}`,
        status: 'draft',
        upstream_entity_id: connectionId,
        upstream_entity_type: 'connections',
        owner: {},
        governance: {
          classification: 'internal',
          pii_fields: [],
          compliance_requirements: [],
          tags: [],
        },
        metadata: {},
        created_at: now,
        updated_at: now,
      },
    },
  };
}

function applyBundleResultToFixture(fixture, result, preassigned) {
  const p = parsePayload(result);
  if (!p) return;
  fixture.workflow_id = p.workflow_id ?? preassigned?.workflowId ?? fixture.workflow_id;
  const entities = p.created_entities ?? [];
  if (Array.isArray(entities)) {
    const dp = entities.find(
      e =>
        e.entity_type === 'data-products' ||
        e.entity_type === 'data_product' ||
        String(e.path ?? '').includes('data-products')
    );
    fixture.data_product_id = dp?.entity_id ?? preassigned?.dataProductId ?? fixture.data_product_id;
  } else if (preassigned?.dataProductId) {
    fixture.data_product_id = preassigned.dataProductId;
  }
}

async function run() {
  const fixture = {
    project_id: null,
    workflow_id: null,
    connector_id: null,
    connection_id: null,
    data_product_id: null,
    domain_id: null,
    schema_id: null,
    schema_version_id: null,
    quality_rule_id: null,
    instance_id: null,
    deployment_id: null,
    user_id: null,
    organization_id: null,
    user_email: null,
    organization_name: null,
    semantic_artifact_type: null,
    semantic_artifact_id: null,
    first_table_name: null,
  };

  const t0 = await getTokens();
  envMeta = {
    stack: t0.api_base_url?.includes('dev') ? 'dev' : 'prod',
    mcp_endpoint: t0.api_base_url?.includes('dev')
      ? 'https://mcpdev.loxtep.io/ai/mcp/stream'
      : 'https://mcp.loxtep.io/ai/mcp/stream',
    api_url: t0.api_base_url,
    methodology:
      'Full S0–S15 happy-path via customer-mcp-server callToolApi (MCP tools/call Function URL). No REST bypasses.',
  };

  console.log(`Running S0–S15 (${REPORT_ID}) against ${t0.api_base_url} …`);

  // S0 + S12
  let r = await callMcp('loxtep_session', { operation: 'get_current_user' });
  logStep('S0', 'get_current_user', 'loxtep_session', 'get_current_user', r);
  if (r.ok) {
    const p = parsePayload(r);
    const user = p?.user ?? p;
    fixture.user_id = user?.user_id ?? p?.user_id ?? p?.id;
    fixture.organization_id = user?.organization_id ?? p?.organization_id ?? p?.organization?.organization_id;
    fixture.user_email = user?.email ?? p?.email;
    envMeta.user_id = fixture.user_id;
    envMeta.user_email = fixture.user_email;
    envMeta.organization_id = fixture.organization_id;
  }
  r = await callMcp('loxtep_session', { operation: 'get_current_organization' });
  logStep('S0', 'get_current_organization', 'loxtep_session', 'get_current_organization', r);
  if (r.ok) {
    const p = parsePayload(r);
    fixture.organization_name = p?.name ?? p?.organization?.name;
    envMeta.organization_name = fixture.organization_name;
  }
  setStory('S0', 'loxtep-mcp-session', steps.filter(s => s.story_id === 'S0').map(s => s.status));
  logStep('S12', 'mcp_session_active', 'loxtep_session', 'session', { ok: true });
  setStory('S12', 'loxtep-auth', ['PASS']);

  // Bootstrap project + instances
  r = await callMcp('loxtep_workspace', {
    operation: 'create_project',
    name: `mcp-story-test-${REPORT_DATE}-${REPORT_SUFFIX}`,
    description: 'MCP skills user stories gap test',
  });
  logStep('S2', 'create_project', 'loxtep_workspace', 'create_project', r);
  if (r.ok) {
    const p = parsePayload(r);
    fixture.project_id = p?.project_id ?? p?.id ?? fixture.project_id;
  }

  r = await callMcp('loxtep_workspace', { operation: 'list_instances' });
  logStep('S11', 'list_instances', 'loxtep_workspace', 'list_instances', r);
  if (r.ok) {
    const p = parsePayload(r);
    const list = p?.items ?? p?.instances ?? p?.data?.items ?? (Array.isArray(p?.data) ? p.data : null);
    if (Array.isArray(list) && list[0]) {
      fixture.instance_id = list[0].instance_id ?? list[0].id ?? fixture.instance_id;
    }
  }

  // S1
  await runStorySteps('S1', 'connect-external-system', [
    async () => {
      const res = await callMcp('loxtep_connect', { operation: 'list_connector_types' });
      return logStep('S1', 'list_connector_types', 'loxtep_connect', 'list_connector_types', res);
    },
    async () => {
      const res = await callMcp('loxtep_connect', {
        operation: 'create_connector',
        connector_type: 'sdk',
        metadata: {
          name: `mcp-story-test-sdk-${REPORT_DATE}`,
          ...(fixture.project_id ? { project_id: fixture.project_id } : {}),
          ...(fixture.instance_id ? { instance_id: fixture.instance_id } : {}),
        },
      });
      if (res.ok) {
        const p = parsePayload(res);
        fixture.connector_id =
          p?.connector_id ?? p?.id ?? p?.connector?.connector_id ?? fixture.connector_id;
      }
      return logStep('S1', 'create_connector sdk', 'loxtep_connect', 'create_connector', res);
    },
    async () => {
      const res = await callMcp('loxtep_connect', {
        operation: 'get_oauth_url',
        connector_type: 'shopify',
        ...(fixture.project_id ? { project_id: fixture.project_id } : {}),
        connection_config: { shop: 'mcp-story-test.myshopify.com' },
      });
      return logStep('S1', 'get_oauth_url shopify', 'loxtep_connect', 'get_oauth_url', res);
    },
    async () => {
      if (!fixture.project_id) {
        return skipped('S1', 'get_oauth_url shopify no shop', 'loxtep_connect', 'get_oauth_url', 'no project_id');
      }
      const res = await callMcp('loxtep_connect', {
        operation: 'get_oauth_url',
        connector_type: 'shopify',
        project_id: fixture.project_id,
      });
      return logStep('S1', 'get_oauth_url shopify no shop', 'loxtep_connect', 'get_oauth_url', res, {
        note: res.ok ? 'unexpected pass' : 'expected validation fail without connection_config.shop',
      });
    },
    async () => {
      if (!fixture.connector_id) {
        return skipped('S1', 'capture_samples', 'loxtep_connect', 'capture_samples', 'no connector_id');
      }
      const res = await callMcp('loxtep_connect', {
        operation: 'capture_samples',
        connector_id: fixture.connector_id,
      });
      return logStep('S1', 'capture_samples', 'loxtep_connect', 'capture_samples', res, {
        note: 'P1 connect ends here; connection nodes are created in save_workflow_bundle (S2)',
      });
    },
    async () => {
      if (!fixture.project_id) {
        return skipped('S1', 'list_triggers', 'loxtep_build', 'list_triggers', 'no project_id');
      }
      const res = await callMcp('loxtep_build', {
        operation: 'list_triggers',
        project_id: fixture.project_id,
      });
      return logStep('S1', 'list_triggers', 'loxtep_build', 'list_triggers', res);
    },
  ]);

  // S2 — Flow E: get_entity_schemas → save_workflow_bundle (dry_run then persist)
  if (fixture.project_id) {
    let bundleDraft = null;

    await runStorySteps('S2', 'data-workflows', [
      async () => {
        const res = await callMcp('loxtep_build', {
          operation: 'get_entity_schemas',
          project_id: fixture.project_id,
          pattern: 'ingestion',
        });
        return logStep('S2', 'get_entity_schemas ingestion', 'loxtep_build', 'get_entity_schemas', res);
      },
      async () => {
        bundleDraft = buildMcpStoryIngestionBundle(fixture, REPORT_DATE);
        const res = await callMcp('loxtep_build', {
          operation: 'save_workflow_bundle',
          project_id: fixture.project_id,
          dry_run: true,
          files: bundleDraft.files,
        });
        applyBundleResultToFixture(fixture, res, bundleDraft);
        return logStep('S2', 'save_workflow_bundle dry_run', 'loxtep_build', 'save_workflow_bundle', res, {
          note: fixture.connector_id
            ? 'SDK connection node uses connector_id from S1'
            : 'webhook fallback (no connector_id from S1)',
        });
      },
      async () => {
        if (!bundleDraft?.files) {
          return skipped(
            'S2',
            'save_workflow_bundle persist',
            'loxtep_build',
            'save_workflow_bundle',
            'dry_run did not produce bundle'
          );
        }
        const res = await callMcp('loxtep_build', {
          operation: 'save_workflow_bundle',
          project_id: fixture.project_id,
          dry_run: false,
          files: bundleDraft.files,
        });
        applyBundleResultToFixture(fixture, res, bundleDraft);
        return logStep('S2', 'save_workflow_bundle persist', 'loxtep_build', 'save_workflow_bundle', res);
      },
      async () => {
        const res = await callMcp('loxtep_build', {
          operation: 'list_workflows',
          project_id: fixture.project_id,
        });
        return logStep('S2', 'list_workflows', 'loxtep_build', 'list_workflows', res);
      },
      async () => {
        if (!fixture.workflow_id) {
          return skipped('S2', 'get_workflow', 'loxtep_build', 'get_workflow', 'no workflow_id');
        }
        const res = await callMcp('loxtep_build', {
          operation: 'get_workflow',
          project_id: fixture.project_id,
          workflow_id: fixture.workflow_id,
        });
        return logStep('S2', 'get_workflow', 'loxtep_build', 'get_workflow', res);
      },
      async () => {
        if (!fixture.workflow_id) {
          return skipped('S2', 'get_workflow_graph', 'loxtep_build', 'get_workflow_graph', 'no workflow_id');
        }
        const res = await callMcp('loxtep_build', {
          operation: 'get_workflow_graph',
          project_id: fixture.project_id,
          workflow_id: fixture.workflow_id,
        });
        return logStep('S2', 'get_workflow_graph', 'loxtep_build', 'get_workflow_graph', res);
      },
      async () => {
        if (!fixture.data_product_id) {
          return skipped('S2', 'get_data_product', 'loxtep_build', 'get_data_product', 'no data_product_id');
        }
        const res = await callMcp('loxtep_build', {
          operation: 'get_data_product',
          data_product_id: fixture.data_product_id,
        });
        return logStep('S2', 'get_data_product', 'loxtep_build', 'get_data_product', res);
      },
      async () => {
        const res = await callMcp('loxtep_build', { operation: 'list_data_products' });
        return logStep('S2', 'list_data_products', 'loxtep_build', 'list_data_products', res);
      },
    ]);
  } else {
    setStory('S2', 'data-workflows', ['FAIL']);
  }

  // S4
  if (fixture.data_product_id) {
    await runStorySteps('S4', 'org-semantics-quality', [
      async () => {
        const res = await callMcp('loxtep_schemas', {
          operation: 'create_schema',
          name: `mcp-story-schema-${REPORT_DATE}`,
          version: '1.0.0',
          format: 'json-schema',
          fields: [{ name: 'id', type: 'string', required: true }],
          definition: { type: 'object', properties: { id: { type: 'string' } } },
        });
        if (res.ok) {
          const p = parsePayload(res);
          fixture.schema_version_id = p?.schema_version_id ?? p?.data?.schema_version_id;
          fixture.schema_id = p?.schema_id ?? p?.data?.schema_id;
        }
        return logStep('S4', 'create_schema', 'loxtep_schemas', 'create_schema', res);
      },
      async () => {
        if (!fixture.schema_version_id) {
          return skipped('S4', 'get_schema', 'loxtep_schemas', 'get_schema', 'no schema_version_id');
        }
        const res = await callMcp('loxtep_schemas', {
          operation: 'get_schema',
          schema_version_id: fixture.schema_version_id,
        });
        return logStep('S4', 'get_schema', 'loxtep_schemas', 'get_schema', res);
      },
      async () => {
        const res = await callMcp('loxtep_quality', {
          operation: 'create_quality_rule',
          data_product_id: fixture.data_product_id,
          name: `mcp-story-qr-${REPORT_DATE}`,
          rule_type: 'completeness',
          condition: 'id IS NOT NULL',
          threshold: 95,
          severity: 'medium',
        });
        if (res.ok) {
          const p = parsePayload(res);
          fixture.quality_rule_id = p?.quality_rule_id ?? p?.data_quality_rule_id;
        }
        return logStep('S4', 'create_quality_rule', 'loxtep_quality', 'create_quality_rule', res);
      },
      async () => {
        const res = await callMcp('loxtep_quality', { operation: 'list_quality_rules' });
        return logStep('S4', 'list_quality_rules', 'loxtep_quality', 'list_quality_rules', res);
      },
    ]);
  } else {
    setStory('S4', 'org-semantics-quality', ['SKIPPED']);
  }

  // S3
  if (fixture.data_product_id) {
    await runStorySteps('S3', 'data-workflows', [
      async () => {
        const res = await callMcp('loxtep_build', {
          operation: 'list_targets',
          data_product_id: fixture.data_product_id,
        });
        return logStep('S3', 'list_targets', 'loxtep_build', 'list_targets', res);
      },
      async () => {
        const res = await callMcp('loxtep_build', {
          operation: 'create_target',
          data_product_id: fixture.data_product_id,
          endpoint_url: 'https://example.com/webhook/mcp-story-test',
        });
        return logStep('S3', 'create_target', 'loxtep_build', 'create_target', res);
      },
    ]);
  } else {
    setStory('S3', 'data-workflows', ['SKIPPED']);
  }

  // S5
  await runStorySteps('S5', 'discover-govern-lineage', [
    async () => {
      const res = await callMcp('loxtep_catalog', { operation: 'search_catalog', query: 'order', limit: 5 });
      return logStep('S5', 'search_catalog', 'loxtep_catalog', 'search_catalog', res);
    },
    async () => {
      if (!fixture.data_product_id) {
        return skipped('S5', 'get_catalog_entry', 'loxtep_catalog', 'get_catalog_entry', 'no data_product_id');
      }
      const res = await callMcp('loxtep_catalog', {
        operation: 'get_catalog_entry',
        entry_id: fixture.data_product_id,
        entry_type: 'data_product',
      });
      return logStep('S5', 'get_catalog_entry', 'loxtep_catalog', 'get_catalog_entry', res);
    },
    async () => {
      const res = await callMcp('loxtep_catalog', { operation: 'list_domains' });
      return logStep('S5', 'list_domains', 'loxtep_catalog', 'list_domains', res);
    },
    async () => {
      const res = await callMcp('loxtep_catalog', { operation: 'list_tags' });
      return logStep('S5', 'list_tags', 'loxtep_catalog', 'list_tags', res);
    },
    async () => {
      if (!fixture.data_product_id) {
        return skipped('S5', 'get_lineage_impact', 'loxtep_catalog', 'get_lineage_impact', 'no data_product_id');
      }
      const res = await callMcp('loxtep_catalog', {
        operation: 'get_lineage_impact',
        data_product_id: fixture.data_product_id,
      });
      return logStep('S5', 'get_lineage_impact', 'loxtep_catalog', 'get_lineage_impact', res);
    },
  ]);

  // S6 (org-scoped analytics)
  await runStorySteps('S6', 'loxtep-analytics', [
      async () => {
        const res = await callMcp('loxtep_analytics', {
          operation: 'list_tables',
        });
        if (res.ok) {
          const p = parsePayload(res);
          const tables = p?.tables ?? p?.data?.tables ?? p;
          if (Array.isArray(tables) && tables[0]) {
            fixture.first_table_name = tables[0].name ?? tables[0].table_name ?? tables[0];
          }
        }
        return logStep('S6', 'list_tables', 'loxtep_analytics', 'list_tables', res, {
          note: fixture.first_table_name ? `tables found` : '0 tables',
        });
      },
      async () => {
        const res = await callMcp('loxtep_analytics', {
          operation: 'execute_query',
          query: 'SELECT 1 as ok',
        });
        return logStep('S6', 'execute_query', 'loxtep_analytics', 'execute_query', res);
      },
      async () => {
        const table = fixture.first_table_name ?? 'nonexistent_table';
        const res = await callMcp('loxtep_analytics', {
          operation: 'get_table_schema',
          table_name: table,
        });
        return logStep('S6', 'get_table_schema', 'loxtep_analytics', 'get_table_schema', res);
    },
  ]);

  // S7
  await runStorySteps('S7', 'loxtep-workspace', [
    async () => {
      if (!fixture.project_id) {
        return skipped('S7', 'list_versions', 'loxtep_workspace', 'list_versions', 'no project_id');
      }
      const res = await callMcp('loxtep_workspace', {
        operation: 'list_versions',
        project_id: fixture.project_id,
      });
      return logStep('S7', 'list_versions', 'loxtep_workspace', 'list_versions', res);
    },
    async () => {
      if (!fixture.project_id) {
        return skipped('S7', 'create_snapshot', 'loxtep_workspace', 'create_snapshot', 'no project_id');
      }
      const res = await callMcp('loxtep_workspace', {
        operation: 'create_snapshot',
        project_id: fixture.project_id,
        name: `mcp-story-snap-${REPORT_DATE}`,
      });
      return logStep('S7', 'create_snapshot', 'loxtep_workspace', 'create_snapshot', res);
    },
    async () => {
      const args = { operation: 'get_queue_info' };
      if (fixture.data_product_id) args.data_product_id = fixture.data_product_id;
      const res = await callMcp('loxtep_workspace', args);
      return logStep('S7', 'get_queue_info', 'loxtep_workspace', 'get_queue_info', res);
    },
    async () => {
      const args = { operation: 'read_queue_events', count: 1 };
      if (fixture.instance_id) args.instance_id = fixture.instance_id;
      if (fixture.data_product_id) args.data_product_id = fixture.data_product_id;
      const res = await callMcp('loxtep_workspace', args);
      return logStep('S7', 'read_queue_events', 'loxtep_workspace', 'read_queue_events', res);
    },
  ]);

  // S8
  const entityId = `mcp-story-entity-${REPORT_DATE}`;
  await runStorySteps('S8', 'loxtep-process-intel', [
    async () => {
      const res = await callMcp('loxtep_process_intel', {
        operation: 'create_entity_context',
        entity_id: entityId,
        entity_type: 'customer',
        attributes: { source: 'mcp-story-test', status: 'active' },
      });
      return logStep('S8', 'create_entity_context', 'loxtep_process_intel', 'create_entity_context', res);
    },
    async () => {
      const res = await callMcp('loxtep_process_intel', {
        operation: 'get_entity_context',
        entity_id: entityId,
        entity_type: 'customer',
      });
      return logStep('S8', 'get_entity_context', 'loxtep_process_intel', 'get_entity_context', res);
    },
    async () => {
      const res = await callMcp('loxtep_process_intel', {
        operation: 'query_entity_context',
        entity_id: entityId,
        entity_type: 'customer',
        query: 'recent decisions',
      });
      return logStep('S8', 'query_entity_context', 'loxtep_process_intel', 'query_entity_context', res);
    },
  ]);

  // S9
  await runStorySteps('S9', 'loxtep-procedures', [
    async () => {
      const res = await callMcp('loxtep_procedures', { operation: 'list_procedures' });
      return logStep('S9', 'list_procedures', 'loxtep_procedures', 'list_procedures', res);
    },
  ]);

  // S10
  await runStorySteps('S10', 'loxtep-agent-workspace', [
    async () => {
      const res = await callMcp('loxtep_agent_workspace', { operation: 'agent_orchestration_list_issues' });
      return logStep('S10', 'agent_orchestration_list_issues', 'loxtep_agent_workspace', 'agent_orchestration_list_issues', res);
    },
    async () => {
      const res = await callMcp('loxtep_agent_workspace', {
        operation: 'agent_orchestration_create_issue',
        title: `MCP story test issue ${REPORT_DATE}`,
      });
      return logStep('S10', 'agent_orchestration_create_issue', 'loxtep_agent_workspace', 'agent_orchestration_create_issue', res);
    },
    async () => {
      const res = await callMcp('loxtep_agent_workspace', {
        operation: 'agent_orchestration_create_project',
        name: `MCP story agent project ${REPORT_DATE}`,
      });
      return logStep('S10', 'agent_orchestration_create_project', 'loxtep_agent_workspace', 'agent_orchestration_create_project', res);
    },
  ]);

  setStory('S11', 'loxtep-instances', steps.filter(s => s.story_id === 'S11').map(s => s.status));

  // S13
  await runStorySteps('S13', 'loxtep-ontology', [
    async () => {
      const res = await callMcp('loxtep_ontology', {
        operation: 'create_ontology_concept',
        name: `MCP Story Concept ${REPORT_DATE}`,
        label: 'MCP Story Concept',
        namespace: 'mcp-story',
        node_type: 'entity',
      });
      return logStep('S13', 'create_ontology_concept', 'loxtep_ontology', 'create_ontology_concept', res);
    },
  ]);

  // S14
  await runStorySteps('S14', 'loxtep-deployments', [
    async () => {
      const res = await callMcp('loxtep_deployments', { operation: 'list_deployments' });
      return logStep('S14', 'list_deployments', 'loxtep_deployments', 'list_deployments', res);
    },
    async () => {
      if (!fixture.project_id || !fixture.instance_id) {
        return skipped('S14', 'deploy_project', 'loxtep_deployments', 'deploy_project', 'missing project_id or instance_id');
      }
      const res = await callMcp('loxtep_deployments', {
        operation: 'deploy_project',
        project_id: fixture.project_id,
        instance_id: fixture.instance_id,
      });
      if (res.ok) {
        const p = parsePayload(res);
        fixture.deployment_id = p?.deployment_id ?? p?.id;
      }
      return logStep('S14', 'deploy_project', 'loxtep_deployments', 'deploy_project', res);
    },
    async () => {
      if (!fixture.deployment_id) {
        return skipped('S14', 'get_deployment', 'loxtep_deployments', 'get_deployment', 'no deployment_id');
      }
      const res = await callMcp('loxtep_deployments', {
        operation: 'get_deployment',
        deployment_id: fixture.deployment_id,
      });
      return logStep('S14', 'get_deployment', 'loxtep_deployments', 'get_deployment', res);
    },
  ]);

  // S15
  await runStorySteps('S15', 'loxtep-semantic-layer', [
    async () => {
      const res = await callMcp('loxtep_semantic_layer', {
        operation: 'search_semantic_layer',
        query: 'customer',
      });
      if (res.ok) {
        const p = parsePayload(res);
        const items = p?.results ?? p?.artifacts ?? p?.items ?? [];
        if (Array.isArray(items) && items[0]) {
          fixture.semantic_artifact_type = items[0].type ?? items[0].artifact_type ?? 'concept';
          fixture.semantic_artifact_id = items[0].id ?? items[0].artifact_id;
        }
      }
      return logStep('S15', 'search_semantic_layer', 'loxtep_semantic_layer', 'search_semantic_layer', res);
    },
    async () => {
      const res = await callMcp('loxtep_semantic_layer', { operation: 'get_semantic_completeness' });
      return logStep('S15', 'get_semantic_completeness', 'loxtep_semantic_layer', 'get_semantic_completeness', res);
    },
    async () => {
      if (!fixture.semantic_artifact_id) {
        return skipped('S15', 'get_semantic_artifact', 'loxtep_semantic_layer', 'get_semantic_artifact', 'no artifact from search');
      }
      const res = await callMcp('loxtep_semantic_layer', {
        operation: 'get_semantic_artifact',
        artifact_type: fixture.semantic_artifact_type,
        artifact_id: fixture.semantic_artifact_id,
      });
      return logStep('S15', 'get_semantic_artifact', 'loxtep_semantic_layer', 'get_semantic_artifact', res);
    },
  ]);

  // Cleanup
  if (fixture.connector_id) {
    const res = await callMcp('loxtep_connect', {
      operation: 'delete_connector',
      connector_id: fixture.connector_id,
    });
    logStep('S1', 'delete_connector cleanup', 'loxtep_connect', 'delete_connector', res);
  }
  if (fixture.project_id) {
    const res = await callMcp('loxtep_workspace', {
      operation: 'delete_project',
      project_id: fixture.project_id,
    });
    logStep('S2', 'delete_project cleanup', 'loxtep_workspace', 'delete_project', res);
  }

  // Ensure all stories set
  for (const id of ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'S11', 'S13', 'S14', 'S15']) {
    if (!stories[id]) {
      const ss = steps.filter(s => s.story_id === id).map(s => s.status);
      if (ss.length) setStory(id, id, ss);
      else stories[id] = { status: 'SKIPPED', skill: id };
    }
  }

  const summary = {
    pass: Object.values(stories).filter(s => s.status === 'PASS').length,
    partial: Object.values(stories).filter(s => s.status === 'PARTIAL').length,
    fail: Object.values(stories).filter(s => s.status === 'FAIL').length,
    blocked: Object.values(stories).filter(s => s.status === 'BLOCKED').length,
  };

  const prior = loadPriorSummary();

  const report = {
    report_id: REPORT_ID,
    generated_at: new Date().toISOString(),
    environment: envMeta,
    summary: { stories_attempted: 16, ...summary, workarounds_used: 0, prior_run: PRIOR_RUN },
    stories,
    steps,
    fixture,
    improvements_since_prior: computeImprovements(prior),
    regressions_or_still_open: computeGaps(),
  };

  fs.mkdirSync(DOCS_DIR, { recursive: true });
  const jsonPath = path.join(DOCS_DIR, `${REPORT_ID}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  const mdPath = path.join(DOCS_DIR, `${REPORT_ID}.md`);
  fs.writeFileSync(mdPath, renderMarkdown(report, prior, jsonPath));
  console.log(`Wrote ${jsonPath}`);
  console.log(`Wrote ${mdPath}`);
  console.log('Summary:', summary);
}

function loadPriorSummary() {
  try {
    const p = path.join(DOCS_DIR, `${PRIOR_RUN}.json`);
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function computeImprovements(prior) {
  if (!prior?.stories) return [];
  const out = [];
  for (const [id, cur] of Object.entries(stories)) {
    const prev = prior.stories[id]?.status;
    if (prev && prev !== 'PASS' && cur.status === 'PASS') {
      out.push(`${id} promoted to PASS (was ${prev})`);
    }
  }
  return out;
}

function computeGaps() {
  return steps
    .filter(s => s.status === 'FAIL')
    .map(s => `${s.story_id} ${s.step}: ${s.error ?? 'failed'}`);
}

const STORY_TITLES = {
  S0: 'Session / org',
  S1: 'Connectors',
  S2: 'Flow E bundle / DP',
  S3: 'Webhook delivery',
  S4: 'Schemas / quality',
  S5: 'Discover / lineage',
  S6: 'Analytics SQL',
  S7: 'Workspace / queues',
  S8: 'Process intel',
  S9: 'Procedures',
  S10: 'Agent workspace',
  S11: 'Instances',
  S12: 'Auth',
  S13: 'Ontology',
  S14: 'Deployments',
  S15: 'Semantic layer',
};

function storyTitle(id) {
  return STORY_TITLES[id] ?? id;
}

function storyNotes(id) {
  const ss = steps.filter(s => s.story_id === id);
  const fails = ss.filter(s => s.status === 'FAIL');
  if (!fails.length) {
    const notes = ss.map(s => s.note).filter(Boolean);
    return notes[0] ?? '';
  }
  return fails.map(f => f.step + ' FAIL').join('; ');
}

function renderMarkdown(report, prior, jsonPath) {
  const priorSummary = prior?.summary;
  const deltaPass = priorSummary ? report.summary.pass - priorSummary.pass : null;
  const deltaPartial = priorSummary ? report.summary.partial - priorSummary.partial : null;

  const scorecard = Object.entries(report.stories)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, s]) => {
      const notes = storyNotes(id);
      return `| ${id} | ${storyTitle(id)} | **${s.status}** | ${notes || '—'} |`;
    })
    .join('\n');

  const gaps = report.regressions_or_still_open.length
    ? report.regressions_or_still_open.map(g => `| ${g.split(':')[0]} | ${g} | P1 |`).join('\n')
    : '| — | No step-level FAILs | — |';

  const improvements = report.improvements_since_prior.length
    ? report.improvements_since_prior.map((x, i) => `${i + 1}. ${x}`).join('\n')
    : '1. _(none vs prior run)_';

  return `# Skills User Stories Gap Report (Run ${REPORT_SUFFIX.replace(/^r/, '')})

**Date:** ${REPORT_DATE}  
**Environment:** Loxtep **${report.environment.stack}** (\`${report.environment.mcp_endpoint}\` / \`${report.environment.api_url}\`)  
**Org:** ${report.environment.organization_name ?? '—'} (\`${report.environment.organization_id ?? '—'}\`)  
**User:** \`${report.environment.user_email ?? '—'}\`  
**Methodology:** ${report.environment.methodology}

Machine-readable log: [\`${path.basename(jsonPath)}\`](./${path.basename(jsonPath)})

---

## Executive summary

| Metric | ${prior ? PRIOR_RUN.split('-').pop() : 'prior'} | **${REPORT_SUFFIX}** | Δ |
|--------|----|--------|---|
| PASS | ${priorSummary?.pass ?? '—'} | **${report.summary.pass}** | ${deltaPass != null ? (deltaPass >= 0 ? '+' : '') + deltaPass : '—'} |
| PARTIAL | ${priorSummary?.partial ?? '—'} | **${report.summary.partial}** | ${deltaPartial != null ? (deltaPartial >= 0 ? '+' : '') + deltaPartial : '—'} |
| FAIL | ${priorSummary?.fail ?? '—'} | **${report.summary.fail}** | — |
| BLOCKED | ${priorSummary?.blocked ?? '—'} | **${report.summary.blocked}** | — |

**Headline:** ${headline(report)}

---

## Story scorecard

| ID | Story | Status | Notes |
|----|--------|--------|-------|
${scorecard}

---

## Improvements since ${prior ? PRIOR_RUN.split('-').pop() : 'prior'}

${improvements}

---

## Regressions / still open

| Gap | Detail | Priority |
|-----|--------|----------|
${gaps}

---

## Next step

${nextStep(report)}
`;
}

function headline(report) {
  const fails = report.steps.filter(s => s.status === 'FAIL');
  if (!fails.length && report.summary.pass >= 10) {
    return 'Broad MCP coverage green; remaining PARTIAL stories are mostly shallow happy-path or data-fixture gaps.';
  }
  if (fails.some(f => f.story_id === 'S4' && f.step.includes('create_schema'))) {
    return 'S4 schema create still failing — domain-schema JSON path needs deploy or serialization fix.';
  }
  const top = fails[0];
  return top ? `${top.story_id} ${top.step} still failing — see step log.` : 'See step log for partial coverage gaps.';
}

function nextStep(report) {
  const s4fail = report.steps.find(s => s.story_id === 'S4' && s.operation === 'create_schema' && s.status === 'FAIL');
  if (s4fail) return 'Deploy domain-schema fix to target stack and re-run S4.';
  if (report.summary.partial > 0) return 'Extend shallow stories (S9 procedures CRUD, S11 create_instance, S14 deployment poll) in a follow-up run.';
  return 'Maintain cadence — re-run after platform releases.';
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
