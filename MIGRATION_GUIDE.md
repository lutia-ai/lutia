# Migration Guide: Legacy Message Fields to Ordered Content

This guide explains how to migrate your existing database from the legacy message structure (separate `reasoning`, `web_search_results`, and `response` fields) to the new unified `ordered_content` system.

## Overview

The new `ordered_content` system consolidates all response data into a single JSON field that preserves the exact order of streaming content. This eliminates duplication and provides a more accurate representation of how the response was generated.

### What's Changing

**Before (Legacy):**

-   `messages.reasoning` (String) - Separate reasoning content
-   `messages.web_search_results` (JSON) - Separate web search results
-   `messages.response` (String) - Separate response text

**After (New):**

-   `messages.ordered_content` (JSON) - Unified ordered content array

## Migration Steps

### 1. Backup Your Database

Before running any migration, **create a full backup** of your database:

```bash
pg_dump your_database_name > backup_before_migration.sql
```

### 2. Run the Data Migration Script

Convert existing data to the new format:

```bash
npm run migrate:ordered-content
```

This script will:

-   Find all messages with legacy content but no `ordered_content`
-   Convert them to the new format with proper ordering:
    1. Reasoning content first
    2. Web search results second
    3. Response text last (chunked to simulate streaming)
-   Process in batches for performance
-   Provide progress updates

### 3. Verify the Migration

Check that the migration completed successfully:

```bash
npm run migrate:verify
```

This will show:

-   Number of messages with `ordered_content`
-   Number of messages still with legacy fields
-   Sample conversions for inspection

### 4. Apply the Database Schema Changes

Once data migration is complete and verified, apply the schema changes:

```bash
npx prisma migrate dev
```

This will:

-   Remove the `reasoning` column
-   Remove the `web_search_results` column
-   Remove the `response` column
-   Keep only `ordered_content`

### 5. Update Prisma Schema

The schema has been updated to remove legacy fields. After migration, regenerate the Prisma client:

```bash
npx prisma generate
```

## Understanding Ordered Content

The new `ordered_content` is an array of content items with this structure:

```typescript
type ContentItem = {
	type: 'text' | 'tool_use' | 'reasoning';
	content: string;
	metadata?: {
		tool_name?: string;
		tool_data?: any;
		timestamp?: number;
	};
	order: number;
};
```

### Example Conversion

**Legacy Format:**

```json
{
	"reasoning": "Let me think about this...",
	"web_search_results": [
		{
			"results": [{ "title": "Example", "url": "..." }],
			"totalResults": 1
		}
	],
	"response": "Here's the answer..."
}
```

**New Format:**

```json
[
	{
		"type": "reasoning",
		"content": "Let me think about this...",
		"order": 0
	},
	{
		"type": "tool_use",
		"content": "Used web_search",
		"metadata": {
			"tool_name": "web_search",
			"tool_data": {
				"results": [{ "title": "Example", "url": "..." }],
				"totalResults": 1
			},
			"timestamp": 1748805303027
		},
		"order": 1
	},
	{
		"type": "text",
		"content": "Here's the answer...",
		"order": 2
	}
]
```

## Code Changes

### Updated Functions

-   `finalizeResponse()` - Now only saves `ordered_content`
-   `updateExistingMessageAndRequest()` - Only updates `ordered_content`
-   `createMessage()` - Simplified to use `ordered_content`

### Removed Fields from Types

-   `CreateMessageData.response`
-   `CreateMessageData.reasoning`
-   `CreateMessageData.webSearchResults`
-   `SerializedMessage.response`
-   `SerializedMessage.reasoning`
-   `SerializedMessage.webSearchResults`

## Benefits

1. **Eliminates Duplication** - All content stored once in proper order
2. **Preserves Streaming Order** - Exact sequence of content delivery
3. **Better Performance** - Single field instead of multiple queries
4. **Cleaner Code** - Simplified data structures
5. **Future-Proof** - Easy to add new content types

## Rollback Plan

If you need to rollback:

1. Restore from backup:

    ```bash
    psql your_database_name < backup_before_migration.sql
    ```

2. Revert code changes in git:
    ```bash
    git revert [migration-commit-hash]
    ```

## Troubleshooting

### Migration Script Fails

-   Check database connection
-   Ensure no concurrent writes during migration
-   Verify sufficient disk space
-   Check logs for specific error messages

### Verification Shows Issues

-   Re-run migration script
-   Check for corrupted data in legacy fields
-   Manually inspect problematic records

### Schema Migration Fails

-   Ensure all data is migrated first
-   Check for foreign key constraints
-   Verify no active connections to the database

## Support

If you encounter issues during migration:

1. Check the console output for specific error messages
2. Verify database connectivity and permissions
3. Ensure all prerequisites are installed (Node.js, tsx, etc.)
4. Create an issue with error details and sample data (anonymized)

**Important:** Do not proceed with schema changes until data migration is 100% successful and verified.
