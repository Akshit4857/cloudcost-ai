---
title: "Amazon S3 Storage Lifecycle and Intelligent-Tiering"
source_url: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-transition-general-considerations.html"
provider: "AWS"
retrieved_at: "2026-11-05T10:00:00Z"
---

# Amazon S3 Storage Cost Optimization

Amazon Simple Storage Service (Amazon S3) provides scalable object storage, but unmanaged storage buckets often accumulate stale objects, old versions, and incomplete multipart uploads that unnecessarily inflate monthly storage invoices.

## 1. Amazon S3 Intelligent-Tiering
For data with unknown, changing, or unpredictable access patterns, activate Amazon S3 Intelligent-Tiering.
- S3 Intelligent-Tiering automatically monitors access patterns and moves objects that have not been accessed for 30 consecutive days to the Infrequent Access tier (yielding a 40% storage cost reduction).
- Objects unaccessed for 90 days automatically transition to the Archive Instant Access tier (yielding a 68% cost reduction).
- Unlike manual lifecycle transitions, S3 Intelligent-Tiering carries zero retrieval fees when access patterns suddenly increase.

## 2. Automated S3 Lifecycle Policies
For log files, application backups, database exports, and temporary artifacts with predictable lifecycles:
- Define S3 Lifecycle Transition rules: automatically transition objects to S3 Standard-IA (Infrequent Access) after 30 days, and transition to S3 Glacier Flexible Retrieval or Glacier Deep Archive after 90 days.
- S3 Glacier Deep Archive offers storage at approximately $0.00099 per GB-month, delivering over 95% savings compared to S3 Standard storage.
- Define Expiration rules to permanently purge old log archives, temporary ETL staging objects, and test bucket contents after their required retention window expires.

## 3. Abort Incomplete Multipart Uploads
When large object uploads are interrupted or fail, the uploaded parts remain in the bucket indefinitely unless explicitly removed. AWS charges for the storage used by these incomplete parts.
- Configure a bucket lifecycle rule with the `AbortIncompleteMultipartUpload` action set to 7 days.
- This rule automatically deletes lingering multipart upload chunks that did not complete within one week, eliminating hidden storage charges across all active buckets.

## 4. Cleaning Up Noncurrent Object Versions
If S3 Versioning is enabled on a bucket, replacing or deleting an object creates noncurrent versions that continue to accrue full storage costs.
- Configure lifecycle rules to expire noncurrent versions after 30 to 90 days, or transition noncurrent versions to cold Glacier storage.

