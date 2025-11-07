# Estoque-Hiper-ALPA

Este é um sistema de controle de estoque simples, construído com Next.js, para registrar entradas e saídas de produtos usando um leitor de código de barras.

**[Acesse a demonstração ao vivo](https://coletoraalpa.vercel.app)**

## Funcionalidades

- **Registro de Entrada/Saída**: Páginas dedicadas para escanear códigos de barras e registrar a movimentação de produtos.
- **Gerenciamento de Produtos**: Adicione novos produtos e seus respectivos códigos de barras.
- **Importação em Massa**: Importe produtos, códigos de barras e URLs de imagem em massa usando arquivos CSV.
- **Relatório de Estoque**: Visualize o saldo atual de estoque para todos os produtos, com funcionalidade de busca e exportação para CSV.
- **Interface Responsiva**: Adaptada para uso em desktops e dispositivos móveis.
- **Alertas Sonoros**: Feedback sonoro para sucesso ou falha ao escanear um item.

## Primeiros Passos

Siga as instruções abaixo para configurar e executar o projeto em seu ambiente de desenvolvimento local.

### 1. Pré-requisitos

- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- [npm](https://www.npmjs.com/) (geralmente vem com o Node.js)
- Um banco de dados [MySQL](https://www.mysql.com/) (ou um compatível como MariaDB) acessível.

### 2. Instalação

Clone o repositório e instale as dependências do projeto.

```bash
git clone <URL_DO_SEU_REPOSITORIO>
cd <NOME_DO_DIRETORIO>
npm install
```

### 3. Configuração do Banco de Dados

#### a. Crie o arquivo de ambiente

Crie um arquivo chamado `.env.local` na raiz do projeto. Este arquivo guardará suas credenciais do banco de dados de forma segura. Copie e cole o conteúdo abaixo no arquivo:

```env
DB_HOST="localhost"
DB_PORT="3306"
DB_USER="seu_usuario"
DB_PASSWORD="sua_senha"
DB_DATABASE="seu_banco_de_dados"
```

**Importante**: Substitua os valores de `seu_usuario`, `sua_senha` e `seu_banco_de_dados` pelas credenciais corretas do seu banco de dados MySQL.

#### b. Crie as tabelas no banco

O arquivo `schema.sql` contém toda a estrutura de tabelas necessária para a aplicação. Você pode usá-lo para configurar seu banco de dados.

Se você tiver o cliente de linha de comando do MySQL instalado, pode executar o seguinte comando para criar as tabelas (certifique-se de que o banco de dados já exista):

```bash
mysql -u seu_usuario -p seu_banco_de_dados < schema.sql
```

Você será solicitado a inserir a senha do seu usuário do banco de dados.

### 4. Executando a Aplicação

Após instalar as dependências e configurar o banco de dados, você pode iniciar o servidor de desenvolvimento:

```bash
npm run dev
```

A aplicação estará disponível em [http://localhost:9002](http://localhost:9002).

## Como Usar

1.  **Cadastre Produtos**: Vá para a página **Produtos** e adicione seus produtos, incluindo nome, código do sistema e um ou mais códigos de barras. Você também pode usar a funcionalidade de **Importar** para cadastrar em massa.
2.  **Registre Entradas**: Na página **Entrada**, use um leitor de código de barras (ou digite manualmente) para registrar a entrada de itens no estoque.
3.  **Registre Saídas**: Na página **Saída**, faça o mesmo para registrar a baixa de itens.
4.  **Consulte o Estoque**: A página **Relatório** mostra o saldo atual de todos os produtos, permitindo exportar os dados para um arquivo CSV.

## Importando Dados do Hiper

Para migrar os dados do seu sistema antigo (Hiper), você pode exportá-los para arquivos CSV e importá-los através da página **Produtos**.

Execute as seguintes consultas no **SQL Server Management Studio** e salve cada resultado como um arquivo CSV.

**Importante**: Ao salvar, certifique-se de que o delimitador de colunas seja um **ponto e vírgula (;)**.

### 1. Exportar Produtos

Execute esta consulta para obter a lista de produtos. O campo `codigo` no SQL Server será mapeado para `código` na importação.

```sql
SELECT id_produto, nome, id_imagem, codigo
FROM produto;
```

Depois de salvar o CSV, vá para a página **Produtos**, clique em `Importar > Produtos em Massa` e selecione o arquivo gerado.

### 2. Exportar Códigos de Barras

Execute esta consulta para obter os códigos de barras associados aos produtos.

```sql
SELECT id_produto, codigo_barras
FROM produto_sinonimo;
```

Depois de salvar o CSV, vá para a página **Produtos**, clique em `Importar > Códigos de Barras` e selecione o arquivo.

### 3. Exportar Imagens

Execute esta consulta para obter os links das imagens dos produtos.

```sql
SELECT id_imagem, link_imagem_original
FROM imagem;
```

Depois de salvar o CSV, vá para a página **Produtos**, clique em `Importar > Imagens de Produtos` e selecione o arquivo.

## Deploy (Publicação)

Para publicar sua aplicação na internet, recomendamos o uso de serviços com planos gratuitos robustos. Siga os passos na ordem correta para um processo mais fluido.

### Passo 1: Criar o Banco de Dados na Nuvem

Antes de publicar a aplicação, você precisa de um banco de dados MySQL acessível pela internet.

- **[Aiven](https://aiven.io/)**: Oferece um plano gratuito para bancos de dados MySQL, ideal para projetos de pequeno a médio porte.
  1. Crie sua conta no Aiven.
  2. Provisione um novo serviço de banco de dados MySQL.
  3. Após a criação, vá para a aba "Overview" do seu serviço e encontre as credenciais de conexão (`Host`, `Port`, `User`, `Password`). Guarde-as para o próximo passo.
  4. Use uma ferramenta de banco de dados (como DBeaver, TablePlus ou o próprio `mysql` CLI) para se conectar ao banco de dados remoto e execute o conteúdo do arquivo `schema.sql` para criar as tabelas.

### Passo 2: Publicar a Aplicação

Com as credenciais do banco de dados em mãos, você pode publicar a aplicação.

- **[Vercel](https://vercel.com/)**: É a plataforma recomendada para hospedar aplicações Next.js.
  1. Faça o deploy do seu projeto na Vercel, conectando seu repositório do GitHub (ou similar).
  2. Durante a configuração do projeto na Vercel, vá para a seção "Environment Variables".
  3. Adicione as credenciais do seu banco de dados do Aiven, uma a uma, usando os mesmos nomes do arquivo `.env.local`: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE`.
  4. Inicie o deploy. A Vercel irá construir o projeto e publicá-lo em uma URL exclusiva.

## Apoie o Projeto

Se este projeto foi útil para você, considere fazer uma doação para apoiar o desenvolvimento contínuo e a manutenção. Qualquer quantia é bem-vinda!

**Chave PIX**: `f560ea39-e9f0-43a8-b3d2-e754f8dcb6b3`
