import boto3
from botocore.exceptions import NoCredentialsError
import os

MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "localhost:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "finora_admin")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "finora_storage_secret")
BUCKET_NAME = "receipts"

s3_client = boto3.client(
    "s3",
    endpoint_url=f"http://{MINIO_ENDPOINT}",
    aws_access_key_id=MINIO_ACCESS_KEY,
    aws_secret_access_key=MINIO_SECRET_KEY,
    region_name="us-east-1" # MinIO ignora mas boto3 exige
)

def ensure_bucket_exists():
    try:
        s3_client.head_bucket(Bucket=BUCKET_NAME)
    except:
        s3_client.create_bucket(Bucket=BUCKET_NAME)

def upload_file_to_minio(file_path, object_name=None):
    if object_name is None:
        object_name = os.path.basename(file_path)
    
    try:
        ensure_bucket_exists()
        s3_client.upload_file(file_path, BUCKET_NAME, object_name)
        # Retorna a URL que será usada internamente ou via proxy
        return f"{BUCKET_NAME}/{object_name}"
    except Exception as e:
        print(f"Erro ao fazer upload para MinIO: {e}")
        return None

def download_file_from_minio(minio_path, local_path):
    """Baixa um arquivo do MinIO para um caminho local."""
    try:
        bucket, key = minio_path.split('/', 1)
        s3_client.download_file(bucket, key, local_path)
        return True
    except Exception as e:
        print(f"Erro ao baixar do MinIO: {e}")
        return False

def get_presigned_url(object_name):
    """Gera uma URL temporária para visualizar o comprovante."""
    try:
        url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': BUCKET_NAME, 'Key': object_name},
            ExpiresIn=3600 # 1 hora
        )
        return url
    except Exception as e:
        print(f"Erro ao gerar URL do MinIO: {e}")
        return None
