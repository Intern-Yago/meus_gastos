import os
import base64
from PIL import Image
import pdfplumber
from io import BytesIO

def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def process_document(file_path):
    """
    Processa um documento (PDF ou Imagem) e retorna o conteúdo para a IA.
    Para imagens, retorna o base64.
    Para PDFs, tenta extrair texto; se não conseguir, extrai imagem (em versões futuras).
    """
    ext = os.path.splitext(file_path)[1].lower()
    
    if ext in ['.jpg', '.jpeg', '.png']:
        return {"type": "image", "data": encode_image(file_path)}
    
    elif ext == '.pdf':
        text = ""
        try:
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
            
            if text.strip():
                return {"type": "text", "data": text.strip()}
            else:
                # Se não houver texto, poderíamos converter para imagem aqui
                # Por enquanto, vamos retornar que é um PDF sem texto
                return {"type": "error", "data": "PDF sem texto extraível. Por favor, envie uma foto nítida."}
        except Exception as e:
            return {"type": "error", "data": f"Erro ao ler PDF: {str(e)}"}
            
    return {"type": "error", "data": "Formato não suportado."}
