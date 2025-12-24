# SoulBloom Custom Domain Setup

## Domain Information
- **Domain:** soulbloom.care
- **Backend API:** api.soulbloom.care
- **Web Portal:** soulbloom.care (www.soulbloom.care)

## AWS Resources

### ACM Certificate
- **ARN:** `arn:aws:acm:us-east-1:133528275554:certificate/c4b3c5fd-eb1d-41ba-ad79-679421a95c8d`
- **Domains:** soulbloom.care, *.soulbloom.care (wildcard)
- **Status:** PENDING_VALIDATION

### DNS Validation Record (Add to Route 53)
| Type | Name | Value |
|------|------|-------|
| CNAME | `_3b6bfe4d441e8e0a098623e117d54d6e.soulbloom.care` | `_da68e60d1be6580ebcf370d2e915fe22.jkddzztszm.acm-validations.aws.` |

## Setup Steps

### Step 1: Domain Purchase (IN PROGRESS)
- Purchase via Route 53 Console
- Hosted zone auto-created after purchase

### Step 2: Validate SSL Certificate
After hosted zone is created:
```bash
# Add CNAME record for certificate validation
aws route53 change-resource-record-sets \
  --hosted-zone-id HOSTED_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "_3b6bfe4d441e8e0a098623e117d54d6e.soulbloom.care",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "_da68e60d1be6580ebcf370d2e915fe22.jkddzztszm.acm-validations.aws."}]
      }
    }]
  }'
```

### Step 3: Deploy Load Balancer
```bash
cd ~/soulbloom-app/backend
eb deploy
```

### Step 4: Create API DNS Record
```bash
# Get ALB DNS name after deployment
ALB_DNS=$(aws elasticbeanstalk describe-environment-resources \
  --environment-name soulbloom-production \
  --query 'EnvironmentResources.LoadBalancers[0].Name' \
  --output text)

# Create CNAME for api.soulbloom.care -> ALB
aws route53 change-resource-record-sets \
  --hosted-zone-id HOSTED_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "api.soulbloom.care",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "ALB_DNS_NAME"}]
      }
    }]
  }'
```

### Step 5: Web Portal Setup (Later)
- Deploy to S3 + CloudFront
- Or AWS Amplify
- Point soulbloom.care to CloudFront distribution

## Environment Variables to Update
```bash
eb setenv FRONTEND_URL="https://soulbloom.care"
```

## Final URLs
- **API:** https://api.soulbloom.care
- **Web Portal:** https://soulbloom.care
- **Health Check:** https://api.soulbloom.care/health
