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
import type * as caseStudies from "../caseStudies.js";
import type * as channels from "../channels.js";
import type * as chat from "../chat.js";
import type * as clients from "../clients.js";
import type * as collaboration from "../collaboration.js";
import type * as consolidation from "../consolidation.js";
import type * as contracts from "../contracts.js";
import type * as deals from "../deals.js";
import type * as emailTemplates from "../emailTemplates.js";
import type * as files from "../files.js";
import type * as githubIngest from "../githubIngest.js";
import type * as githubSync from "../githubSync.js";
import type * as integrations from "../integrations.js";
import type * as issues from "../issues.js";
import type * as lib_admin from "../lib/admin.js";
import type * as linearIngest from "../linearIngest.js";
import type * as linearSync from "../linearSync.js";
import type * as memory from "../memory.js";
import type * as messages from "../messages.js";
import type * as proposals from "../proposals.js";
import type * as secrets from "../secrets.js";
import type * as seedIssues from "../seedIssues.js";
import type * as users from "../users.js";
import type * as wiki from "../wiki.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auditLogs: typeof auditLogs;
  bookings: typeof bookings;
  caseStudies: typeof caseStudies;
  channels: typeof channels;
  chat: typeof chat;
  clients: typeof clients;
  collaboration: typeof collaboration;
  consolidation: typeof consolidation;
  contracts: typeof contracts;
  deals: typeof deals;
  emailTemplates: typeof emailTemplates;
  files: typeof files;
  githubIngest: typeof githubIngest;
  githubSync: typeof githubSync;
  integrations: typeof integrations;
  issues: typeof issues;
  "lib/admin": typeof lib_admin;
  linearIngest: typeof linearIngest;
  linearSync: typeof linearSync;
  memory: typeof memory;
  messages: typeof messages;
  proposals: typeof proposals;
  secrets: typeof secrets;
  seedIssues: typeof seedIssues;
  users: typeof users;
  wiki: typeof wiki;
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
