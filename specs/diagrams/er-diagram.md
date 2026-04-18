# ER Diagram: Data Model

```mermaid
erDiagram
    USER ||--o{ LINK : creates
    USER ||--o{ REFRESH_TOKEN : has
    USER ||--o{ BULK_IMPORT_JOB : initiates
    LINK ||--o{ CLICK : generates
    BULK_IMPORT_JOB ||--o{ LINK : produces

    USER {
        ObjectId id PK "Unique user identifier"
        string email UK "Unique, used for login"
        string passwordHash "Bcrypt hashed password"
        string name "User full name"
        enum role "user, admin"
        DateTime createdAt "Account creation time"
        DateTime updatedAt "Last profile update"
        boolean isEmailVerified "Email verification status"
        string emailVerificationToken "Token for email verification"
        DateTime emailVerificationExpires "Token expiration time"
    }

    LINK {
        ObjectId id PK "Unique link identifier"
        string shortCode UK "Unique short code (3-20 chars)"
        string originalUrl "The long URL being shortened"
        string urlHash UK "SHA-256 of normalised URL for fast duplicate detection"
        ObjectId userId FK "Link owner"
        string title "Optional user-provided title"
        array tags "Optional tags for categorization"
        DateTime createdAt "When link was created"
        DateTime expiresAt "Optional expiration date"
        boolean isDeleted "Soft-delete flag"
        integer clickCount "Total click count"
        DateTime lastAccessedAt "Timestamp of last redirect"
        string customDescription "Optional user description"
    }

    CLICK {
        ObjectId id PK "Unique click record"
        ObjectId linkId FK "Which link was clicked"
        DateTime timestamp "When click occurred"
        string referrer "HTTP Referer header value"
        string userAgent "User agent string"
        string ipAddressAnonymized "Last octet zeroed out (privacy)"
        string countryCode "Inferred from IP (optional)"
        string deviceType "Desktop, Mobile, Tablet"
        string browserName "Chrome, Firefox, Safari, etc"
    }

    REFRESH_TOKEN {
        ObjectId id PK "Unique token record"
        ObjectId userId FK "Token owner"
        string token "The refresh token value"
        DateTime expiresAt "When token expires (7 days)"
        boolean isBlacklisted "Logout revokes token"
        DateTime createdAt "Token creation time"
    }

    BULK_IMPORT_JOB {
        ObjectId id PK "Job identifier"
        ObjectId userId FK "User who initiated import"
        enum status "queued, processing, completed, failed"
        integer totalRows "Total URLs to import"
        integer successCount "Successfully imported"
        integer failureCount "Failed imports"
        array failedRows "Failed URL details with reasons"
        DateTime startedAt "Job start time"
        DateTime completedAt "Job completion time"
    }
```

## Key Design Decisions

**Link Model:**
- `shortCode` is unique and indexed for fast lookups during redirect
- `userId` + `shortCode` composite index for user-specific queries
- `expiresAt` indexed for efficient expiration checks
- `isDeleted` flag enables soft-delete without losing analytics history
- `clickCount` denormalized for performance (alternative: count clicks from CLICK table)

**Click Model:**
- Separate collection for click analytics (scales independently)
- `ipAddressAnonymized` removes last octet (192.168.1.42 → 192.168.1.0)
- `timestamp` indexed for time-range queries
- Designed for eventual consistency (updates lag by seconds)

**Indexes Required:**
- Link: unique(shortCode), unique(urlHash + userId) for per-user duplicate detection, index(userId), index(expiresAt), index(isDeleted)
- Click: index(linkId, timestamp), index(timestamp)
- User: unique(email)
- RefreshToken: index(userId, expiresAt)
