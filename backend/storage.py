import os
import uuid
import base64
import logging
from typing import Optional

logger = logging.getLogger("cds-storage")

S3_BUCKET = os.environ.get("S3_BUCKET", "").strip()
AWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY_ID", "").strip()
AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY", "").strip()
S3_REGION = os.environ.get("S3_REGION", "us-east-1").strip()
S3_ENDPOINT_URL = os.environ.get("S3_ENDPOINT_URL", "").strip()

_s3_client = None

def get_s3_client():
    global _s3_client
    if _s3_client is not None:
        return _s3_client
    
    if not (S3_BUCKET and AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY):
        return None
        
    try:
        import boto3
        kwargs = {
            "aws_access_key_id": AWS_ACCESS_KEY_ID,
            "aws_secret_access_key": AWS_SECRET_ACCESS_KEY,
            "region_name": S3_REGION,
        }
        if S3_ENDPOINT_URL:
            kwargs["endpoint_url"] = S3_ENDPOINT_URL
            
        _s3_client = boto3.client("s3", **kwargs)
        logger.info(f"Initialized S3 storage client for bucket '{S3_BUCKET}'")
        return _s3_client
    except Exception as e:
        logger.error(f"Failed to initialize S3 client: {e}")
        return None

def upload_file_bytes(file_bytes: bytes, filename: str, content_type: str = "image/jpeg") -> str:
    """
    Uploads bytes to Object Storage if configured.
    If Object Storage is not configured, returns a Data URI string as fallback.
    """
    s3 = get_s3_client()
    if s3 and S3_BUCKET:
        try:
            ext = os.path.splitext(filename)[1] or ".jpg"
            object_key = f"cds-uploads/{uuid.uuid4().hex}{ext}"
            
            s3.put_object(
                Bucket=S3_BUCKET,
                Key=object_key,
                Body=file_bytes,
                ContentType=content_type,
            )
            
            if S3_ENDPOINT_URL:
                url = f"{S3_ENDPOINT_URL.rstrip('/')}/{S3_BUCKET}/{object_key}"
            else:
                url = f"https://{S3_BUCKET}.s3.{S3_REGION}.amazonaws.com/{object_key}"
                
            logger.info(f"Uploaded asset to Object Storage: {url}")
            return url
        except Exception as e:
            logger.error(f"Failed uploading file bytes to Object Storage: {e}")
            
    # Fallback: base64 Data URI
    b64_str = base64.b64encode(file_bytes).decode("utf-8")
    return f"data:{content_type};base64,{b64_str}"

def upload_local_file(file_path: str, filename: str, content_type: str = "video/mp4") -> str:
    """
    Uploads a local file (e.g. video) to Object Storage if configured.
    """
    s3 = get_s3_client()
    if s3 and S3_BUCKET:
        try:
            ext = os.path.splitext(filename)[1] or ".mp4"
            object_key = f"cds-uploads/videos/{uuid.uuid4().hex}{ext}"
            
            with open(file_path, "rb") as f:
                s3.put_object(
                    Bucket=S3_BUCKET,
                    Key=object_key,
                    Body=f,
                    ContentType=content_type,
                )
                
            if S3_ENDPOINT_URL:
                url = f"{S3_ENDPOINT_URL.rstrip('/')}/{S3_BUCKET}/{object_key}"
            else:
                url = f"https://{S3_BUCKET}.s3.{S3_REGION}.amazonaws.com/{object_key}"
                
            logger.info(f"Uploaded video file to Object Storage: {url}")
            return url
        except Exception as e:
            logger.error(f"Failed uploading local file to Object Storage: {e}")
            
    return f"file://{os.path.basename(file_path)}"
