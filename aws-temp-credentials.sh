#!/bin/bash

# AWS Temporary Credentials Setup Script
# This script automates the process of obtaining temporary AWS credentials
# using AWS STS and setting them as environment variables

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "Error: AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check for required parameters
if [ "$#" -lt 1 ]; then
    echo "Usage: $0 <profile_name> [duration_seconds] [mfa_token]"
    echo "  profile_name: AWS profile to use from ~/.aws/credentials"
    echo "  duration_seconds: Optional - Session duration in seconds (default: 3600, max: 43200)"
    echo "  mfa_token: Optional - MFA token code if MFA is required"
    exit 1
fi

PROFILE=$1
DURATION=${2:-3600}
MFA_TOKEN=$3

# Get the ARN of the MFA device for the user if needed
if [ -n "$MFA_TOKEN" ]; then
    # Get the MFA device ARN from the AWS IAM user
    MFA_ARN=$(aws iam list-mfa-devices --profile $PROFILE --query 'MFADevices[0].SerialNumber' --output text)
    
    if [[ "$MFA_ARN" == "None" || -z "$MFA_ARN" ]]; then
        echo "Error: No MFA device found for the user in profile $PROFILE"
        exit 1
    fi
    
    echo "Using MFA device: $MFA_ARN"
    
    # Get temporary credentials with MFA
    CREDS=$(aws sts get-session-token --profile $PROFILE \
        --duration-seconds $DURATION \
        --serial-number $MFA_ARN \
        --token-code $MFA_TOKEN \
        --output json)
else
    # Get temporary credentials without MFA
    CREDS=$(aws sts get-session-token --profile $PROFILE \
        --duration-seconds $DURATION \
        --output json)
fi

# Check if credentials were obtained successfully
if [ $? -ne 0 ]; then
    echo "Failed to obtain temporary credentials"
    exit 1
fi

# Extract credentials
ACCESS_KEY=$(echo $CREDS | jq -r '.Credentials.AccessKeyId')
SECRET_KEY=$(echo $CREDS | jq -r '.Credentials.SecretAccessKey')
SESSION_TOKEN=$(echo $CREDS | jq -r '.Credentials.SessionToken')
EXPIRATION=$(echo $CREDS | jq -r '.Credentials.Expiration')

# Display the commands to set environment variables
echo "# Run these commands to set your AWS temporary credentials:"
echo "export AWS_ACCESS_KEY_ID='$ACCESS_KEY'"
echo "export AWS_SECRET_ACCESS_KEY='$SECRET_KEY'"
echo "export AWS_SESSION_TOKEN='$SESSION_TOKEN'"
echo ""
echo "# Credentials will expire at: $EXPIRATION"

# Create a file with the export commands for sourcing
cat > ~/.aws-temp-creds << EOF
# AWS temporary credentials generated on $(date)
# Expires at: $EXPIRATION
export AWS_ACCESS_KEY_ID='$ACCESS_KEY'
export AWS_SECRET_ACCESS_KEY='$SECRET_KEY'
export AWS_SESSION_TOKEN='$SESSION_TOKEN'
EOF

echo ""
echo "# To set these credentials in your current shell, run:"
echo "source ~/.aws-temp-creds"