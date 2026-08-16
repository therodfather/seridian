/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auditLogs from "../auditLogs.js";
import type * as bookings from "../bookings.js";
import type * as businesses from "../businesses.js";
import type * as caseStudies from "../caseStudies.js";
import type * as channels from "../channels.js";
import type * as chat from "../chat.js";
import type * as clients from "../clients.js";
import type * as collaboration from "../collaboration.js";
import type * as consolidation from "../consolidation.js";
import type * as contracts from "../contracts.js";
import type * as crons from "../crons.js";
import type * as deals from "../deals.js";
import type * as emailTemplates from "../emailTemplates.js";
import type * as files from "../files.js";
import type * as forms from "../forms.js";
import type * as githubIngest from "../githubIngest.js";
import type * as githubProjectsSync from "../githubProjectsSync.js";
import type * as githubSync from "../githubSync.js";
import type * as http from "../http.js";
import type * as integrations from "../integrations.js";
import type * as issues from "../issues.js";
import type * as ivr from "../ivr.js";
import type * as lib_admin from "../lib/admin.js";
import type * as lib_formDefinition from "../lib/formDefinition.js";
import type * as lib_githubProjectsMapping from "../lib/githubProjectsMapping.js";
import type * as lib_ivrGraph from "../lib/ivrGraph.js";
import type * as lib_telnyxExecutor from "../lib/telnyxExecutor.js";
import type * as lib_telnyxSignature from "../lib/telnyxSignature.js";
import type * as lib_workflowGraph from "../lib/workflowGraph.js";
import type * as linearIngest from "../linearIngest.js";
import type * as linearSync from "../linearSync.js";
import type * as memory from "../memory.js";
import type * as messages from "../messages.js";
import type * as payments from "../payments.js";
import type * as proposals from "../proposals.js";
import type * as secrets from "../secrets.js";
import type * as seedIssues from "../seedIssues.js";
import type * as telnyx from "../telnyx.js";
import type * as users from "../users.js";
import type * as wiki from "../wiki.js";
import type * as wikiSeed from "../wikiSeed.js";
import type * as workflowExecutor from "../workflowExecutor.js";
import type * as workflows from "../workflows.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auditLogs: typeof auditLogs;
  bookings: typeof bookings;
  businesses: typeof businesses;
  caseStudies: typeof caseStudies;
  channels: typeof channels;
  chat: typeof chat;
  clients: typeof clients;
  collaboration: typeof collaboration;
  consolidation: typeof consolidation;
  contracts: typeof contracts;
  crons: typeof crons;
  deals: typeof deals;
  emailTemplates: typeof emailTemplates;
  files: typeof files;
  forms: typeof forms;
  githubIngest: typeof githubIngest;
  githubProjectsSync: typeof githubProjectsSync;
  githubSync: typeof githubSync;
  http: typeof http;
  integrations: typeof integrations;
  issues: typeof issues;
  ivr: typeof ivr;
  "lib/admin": typeof lib_admin;
  "lib/formDefinition": typeof lib_formDefinition;
  "lib/githubProjectsMapping": typeof lib_githubProjectsMapping;
  "lib/ivrGraph": typeof lib_ivrGraph;
  "lib/telnyxExecutor": typeof lib_telnyxExecutor;
  "lib/telnyxSignature": typeof lib_telnyxSignature;
  "lib/workflowGraph": typeof lib_workflowGraph;
  linearIngest: typeof linearIngest;
  linearSync: typeof linearSync;
  memory: typeof memory;
  messages: typeof messages;
  payments: typeof payments;
  proposals: typeof proposals;
  secrets: typeof secrets;
  seedIssues: typeof seedIssues;
  telnyx: typeof telnyx;
  users: typeof users;
  wiki: typeof wiki;
  wikiSeed: typeof wikiSeed;
  workflowExecutor: typeof workflowExecutor;
  workflows: typeof workflows;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
