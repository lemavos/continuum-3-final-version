#!/bin/bash

clear

# --- CONFIGURAÇÃO DE CORES ---
VERDE='\033[0;32m'
CIANO='\033[0;36m'
AMARELO='\033[1;33m'
VERMELHO='\033[0;31m'
NC='\033[0m'

# Mensagem padrão de commit
MSG_GENERICA="auto-update: $(date '+%d/%m/%Y %H:%M:%S')"

echo -e "${CIANO}--- Auto-Commit Codespace ---${NC}"

# 1. Verificar se há algo para salvar
MUDANCAS=$(git status --porcelain)

if [ -z "$MUDANCAS" ]; then
    echo -e "${VERMELHO}⚠ Nada para commitar no momento.${NC}"
    exit 0
fi

# 2. Mostrar o que está sendo enviado (rápido)
echo -e "${AMARELO}Arquivos alterados:${NC}"
echo "$MUDANCAS"
echo -e "${AMARELO}--------------------------------------${NC}"

# 3. Executar o fluxo sem perguntas
echo -e "${CIANO}Adicionando arquivos...${NC}"
git add .

echo -e "${CIANO}Commitando com mensagem padrão...${NC}"
git commit -m "$MSG_GENERICA" -q

echo -e "${CIANO}Dando push para o GitHub...${NC}"
git push -q

echo -e "\n${VERDE}✔ Tudo pronto! Código enviado com sucesso.${NC}"