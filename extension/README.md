# NotebookLM Asset Generator - Chrome Extension

Extensão Chrome para automatizar a geração de assets personalizados no Google NotebookLM.

## ✨ Funcionalidades

- **Geração em Lote**: Gere múltiplos assets (Quiz, Resumo em Áudio, Flashcards, etc.) de uma só vez
- **Personalização por Tópico**: Defina tópicos separados por `;` e a extensão gera um asset para cada tópico
- **Injeção Automática**: Os tópicos são automaticamente inseridos no modal de personalização do NotebookLM
- **Interface Simples**: Popup limpo e fácil de usar

## 📦 Instalação

1. **Baixe a extensão**
   - Clone ou baixe este repositório
   - Navegue até a pasta `/extension`

2. **Carregue no Chrome**
   - Abra `chrome://extensions/` no navegador
   - Ative o **Modo do desenvolvedor** (canto superior direito)
   - Clique em **Carregar sem compactação**
   - Selecione a pasta `extension`

3. **Pronto!**
   - A extensão aparecerá na barra de ferramentas do Chrome

## 🚀 Como Usar

1. Acesse [notebooklm.google.com](https://notebooklm.google.com/)
2. Abra um notebook com fontes já adicionadas
3. Clique no ícone da extensão
4. **Tópicos de Personalização**: Digite seus tópicos separados por `;`
   - Exemplo: `Open Banking;Fintechs;Blockchain;Criptomoedas`
5. **Selecione os Assets**: Marque quais assets deseja gerar
6. Clique em **Start Automation**

### Exemplo de Fluxo

Para **3 tópicos** e **2 assets** selecionados:
```
Tópicos: Open Banking;Fintechs;Blockchain
Assets: ☑ Quiz  ☑ Relatórios
```

A extensão executará **6 ciclos**:
1. Quiz → Open Banking
2. Relatórios → Open Banking
3. Quiz → Fintechs
4. Relatórios → Fintechs
5. Quiz → Blockchain
6. Relatórios → Blockchain

## 🎯 Assets Suportados

| Asset | Português | Inglês |
|-------|-----------|--------|
| Áudio | Resumo em Áudio | Audio Overview |
| Vídeo | Resumo em Vídeo | Video Overview |
| Mapa Mental | Mapa mental | Mind map |
| Relatórios | Relatórios | Reports |
| Flashcards | Cartões didáticos | Flashcards |
| Quiz | Teste | Quiz |
| Infográfico | Infográfico | Infographic |
| Slides | Apresentação de slides | Slides |

## 🛠️ Estrutura do Projeto

```
extension/
├── manifest.json    # Configuração da extensão
├── popup.html       # Interface do popup
├── popup.js         # Lógica do popup
├── content.js       # Script de automação injetado na página
└── styles.css       # Estilos do popup
```

## ⚠️ Requisitos

- Google Chrome (versão 88 ou superior)
- Conta Google logada no NotebookLM
- Notebook com fontes já adicionadas

## 🐛 Troubleshooting

**A extensão não encontra os assets:**
- Certifique-se de que está dentro de um notebook (URL contém `/notebook/`)
- Verifique se as fontes já foram adicionadas ao notebook

**O texto não está sendo colado:**
- Recarregue a página do NotebookLM
- Recarregue a extensão em `chrome://extensions/`

**Erro de conexão:**
- Atualize a página e tente novamente

## 📄 Licença

MIT License - Veja [LICENSE.md](../LICENSE.md) para mais detalhes.

## 🤝 Contribuições

Contribuições são bem-vindas! Abra uma issue ou pull request.

---

**Desenvolvido para automatizar tarefas repetitivas no NotebookLM** 🚀
