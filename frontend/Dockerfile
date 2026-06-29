# Use a imagem oficial do Node.js
FROM node:20-slim

# Define o diretório de trabalho
WORKDIR /app

# Copia arquivos de dependências
COPY package*.json ./

# Instala dependências
RUN npm install

# Copia o restante do código
COPY . .

# Compila a aplicação para produção
RUN npm run build

# Expõe a porta do Next.js
EXPOSE 3000

# Comando para rodar em produção
CMD ["npm", "run", "start"]
