---
title: "AWS Cost Optimization: Amazon EC2 Right-Sizing and Modernization"
source_url: "https://docs.aws.amazon.com/whitepapers/latest/cost-optimization-laying-the-foundation/optimizing-ec2.html"
provider: "AWS"
retrieved_at: "2026-11-05T10:00:00Z"
---

# Amazon EC2 Cost Optimization Guidelines

Amazon Elastic Compute Cloud (Amazon EC2) often constitutes a primary share of infrastructure spend. Following the AWS Well-Architected Framework Cost Optimization Pillar, teams should adopt continuous right-sizing, scheduling, and architectural modernization.

## 1. Continuous Right-Sizing and Downsizing
Right-sizing is the process of matching instance types and sizes to your workload performance and capacity requirements. 
- Analyze Amazon CloudWatch metrics over a 14-day window: average CPU utilization, memory pressure, and network throughput.
- Instances with average CPU utilization below 15-20% and peak utilization under 40% are strong candidates for downsizing by one or more sizes (e.g. from m5.xlarge to m5.large), immediately yielding a 50% cost reduction on that instance.
- Consider burstable instance families (such as t4g or t3) for workloads with low baseline CPU utilization that require occasional burst capacity.

## 2. Graviton Processor Modernization
Migrating from x86-based instances (Intel/AMD) to AWS Graviton-based processors (e.g. c7g, m7g, r7g) delivers up to 20% lower instance hourly cost and up to 40% better price performance. Most containerized, Linux, Python, Go, Java, and Node.js applications run seamlessly on arm64 architectures with minimal or no code changes.

## 3. Eliminating Idle and Orphaned Resources
- Terminate unattached Amazon EBS volumes: When EC2 instances are terminated without the DeleteOnTermination flag enabled, associated EBS volumes remain allocated, incurring ongoing storage costs.
- Delete unneeded EBS snapshots and aging AMI backups.
- Review Elastic IP addresses: AWS charges for idle Elastic IP addresses that are not associated with a running instance.

## 4. Scheduling Non-Production Workloads
Development, testing, and staging environments typically do not need to run 24/7.
- Implement automated scheduling (using AWS Instance Scheduler or EventBridge rules) to stop non-production instances during nights and weekends.
- Running non-production workloads only during business hours (10 hours a day, 5 days a week) reduces EC2 compute costs for those environments by approximately 70%.

## 5. Amazon EC2 Auto Scaling
Use EC2 Auto Scaling to dynamically scale compute capacity up during peak traffic periods and scale in during low-traffic hours, ensuring that you only pay for the compute resources your users actually require.

