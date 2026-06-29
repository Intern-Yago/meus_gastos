import boto3
from botocore.exceptions import NoCredentialsError
import os

MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "localhost:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "finora_admin")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "finora_storage_secret")
BUCKET_NAME = "finora"

s3_client = boto3.client(
    "s3",
    endpoint_url=f"http://{MINIO_ENDPOINT}",
    aws_access_key_id=MINIO_ACCESS_KEY,
    aws_secret_access_key=MINIO_SECRET_KEY,
    region_name="us-east-1"
)

def setup_minio_policies():
    """Configura o Bucket e as políticas de Lifecycle para LGPD."""
    try:
        # 1. Garantir que o bucket existe
        try:
            s3_client.head_bucket(Bucket=BUCKET_NAME)
        except:
            s3_client.create_bucket(Bucket=BUCKET_NAME)
            print(f"Bucket '{BUCKET_NAME}' criado.")

        # 2. Habilitar Versionamento (Para comprovantes)
        s3_client.put_bucket_versioning(
            Bucket=BUCKET_NAME,
            VersioningConfiguration={'Status': 'Enabled'}
        )

        # 3. Configurar Lifecycle (LGPD Compliance)
        # Regra: Arquivos em 'extratos/' são deletados após 1 dia (MinIO Lifecycle mínimo é 1 dia)
        # Para 30 minutos, usaremos uma rotina de limpeza manual se necessário, 
        # mas aqui definimos o teto de segurança.
        lifecycle_config = {
            'Rules': [
                {
                    'ID': 'DeleteStatementsAfterOneDay',
                    'Status': 'Enabled',
                    'Prefix': 'extratos/',
                    'Expiration': {'Days': 1},
                    'NoncurrentVersionExpiration': {'NoncurrentDays': 1}
                },
                {
                    'ID': 'CleanOldVersionsOfReceipts',
                    'Status': 'Enabled',
                    'Prefix': 'comprovantes/',
                    'NoncurrentVersionExpiration': {'NoncurrentDays': 30} # Mantém versões por 30 dias
                }
            ]
        }
        s3_client.put_bucket_lifecycle_configuration(
            Bucket=BUCKET_NAME,
            LifecycleConfiguration=lifecycle_config
        )
        print("Políticas de Lifecycle (LGPD) aplicadas com sucesso.")
    except Exception as e:
        print(f"Aviso ao configurar MinIO: {e}")

def upload_file_to_minio(file_path, object_name):
    """
    Faz upload de um arquivo para o MinIO com o nome/caminho especificado.
    """
    try:
        setup_minio_policies()
        s3_client.upload_file(file_path, BUCKET_NAME, object_name)
        return f"{BUCKET_NAME}/{object_name}"
    except Exception as e:
        print(f"Erro ao fazer upload para MinIO: {e}")
        return None

def delete_file_from_minio(minio_path):
    """Remove um arquivo do MinIO (purga física)."""
    try:
        if not minio_path: return False
        # Caminho esperado: finora/comprovantes/nome.pdf
        parts = minio_path.split('/', 1)
        if len(parts) < 2: return False
        
        bucket, key = parts
        s3_client.delete_object(Bucket=bucket, Key=key)
        return True
    except Exception as e:
        print(f"Erro ao deletar do MinIO: {e}")
        return False

def download_file_from_minio(minio_path, local_path):
    try:
        bucket, key = minio_path.split('/', 1)
        s3_client.download_file(bucket, key, local_path)
        return True
    except Exception as e:
        print(f"Erro ao baixar do MinIO: {e}")
        return False

def get_presigned_url(minio_path):
    """Gera uma URL temporária para visualizar o objeto."""
    try:
        bucket, key = minio_path.split('/', 1)
        url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': bucket, 'Key': key},
            ExpiresIn=3600
        )
        return url
    except Exception as e:
        print(f"Erro ao gerar URL do MinIO: {e}")
        return None
