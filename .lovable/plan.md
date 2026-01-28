

## Plano: Implementar Upload de Documentos para Veículos

### Situação Atual

O componente `VeiculoDocumentosSection` atualmente só permite informar uma **URL externa** para documentos. Não existe funcionalidade de **upload de arquivos** (PDF, imagens, etc.) diretamente no sistema.

**Problemas identificados:**
- Não existe bucket de storage no banco de dados
- O formulário pede apenas uma URL, não permite selecionar arquivo do computador
- Os tipos de documento são limitados

---

### 1. Criar Bucket de Storage

Criar um bucket chamado `veiculos-documentos` para armazenar os arquivos:

```sql
-- Criar bucket para documentos de veículos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'veiculos-documentos', 
  'veiculos-documentos', 
  true,
  10485760, -- 10MB limite
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
);

-- Política de leitura pública
CREATE POLICY "Acesso público para leitura" ON storage.objects
  FOR SELECT USING (bucket_id = 'veiculos-documentos');

-- Política para usuários autenticados fazerem upload
CREATE POLICY "Usuários autenticados podem fazer upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'veiculos-documentos' 
    AND auth.role() = 'authenticated'
  );

-- Política para usuários autenticados excluírem
CREATE POLICY "Usuários autenticados podem excluir" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'veiculos-documentos' 
    AND auth.role() = 'authenticated'
  );
```

---

### 2. Atualizar Tipos de Documento

Expandir a lista de tipos para incluir mais categorias:

| Tipo Atual | Novos Tipos a Adicionar |
|------------|------------------------|
| CRLV | Apólice de Seguro |
| Seguro | Multa |
| IPVA | Manutenção |
| Licenciamento | Restrição |
| Laudo de Vistoria | Nota Fiscal de Compra |
| Contrato | Comprovante de Pagamento |
| Nota Fiscal | Foto do Veículo |
| Outros | - |

---

### 3. Atualizar VeiculoDocumentosSection

Modificar o componente para suportar:

**A) Campo de Upload de Arquivo**
- Input type="file" com accept para PDF e imagens
- Preview do arquivo selecionado
- Indicador de progresso do upload

**B) Fluxo de Upload**
1. Usuário seleciona arquivo OU informa URL
2. Se arquivo: faz upload para storage e obtém URL pública
3. Salva registro com URL (do storage ou externa)

**C) Interface Atualizada**

```text
+------------------------------------------+
| Novo Documento                        [X] |
+------------------------------------------+
| Tipo de Documento *  | Nome do Arquivo * |
| [Select: Apólice ▼]  | [________________] |
+------------------------------------------+
| Escolha uma opção:                        |
| (•) Fazer upload de arquivo               |
| ( ) Informar URL externa                  |
+------------------------------------------+
| [Selecionar arquivo...] ou arraste aqui   |
| Formatos: PDF, JPG, PNG (máx. 10MB)       |
+------------------------------------------+
| [Cancelar]            [Salvar Documento]  |
+------------------------------------------+
```

---

### 4. Criar Hook para Upload

Novo hook `useStorageUpload` para gerenciar uploads:

```typescript
// src/hooks/useStorageUpload.ts
export function useStorageUpload(bucketName: string) {
  const uploadFile = async (file: File, path: string) => {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(path, file, { upsert: true });
    
    if (error) throw error;
    
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(path);
    
    return urlData.publicUrl;
  };
  
  const deleteFile = async (path: string) => {
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([path]);
    
    if (error) throw error;
  };

  return { uploadFile, deleteFile };
}
```

---

### 5. Arquivos a Modificar/Criar

| Arquivo | Ação |
|---------|------|
| Migração SQL | Criar bucket e políticas de storage |
| `src/hooks/useStorageUpload.ts` | **Criar** - Hook para upload de arquivos |
| `src/components/VeiculoDocumentosSection.tsx` | **Modificar** - Adicionar upload, novos tipos |

---

### 6. Funcionalidades do Upload

- Arrastar e soltar arquivo (drag & drop)
- Preview do arquivo antes de enviar
- Barra de progresso durante upload
- Validação de tamanho (máx. 10MB)
- Validação de formato (PDF, JPG, PNG, WEBP)
- Opção de informar URL externa (mantém compatibilidade)
- Ícones diferentes por tipo de arquivo

---

### Resultado Esperado

- Usuário poderá fazer upload de PDFs de apólices, multas, notas fiscais
- Arquivos serão armazenados de forma segura no storage
- Sistema mantém compatibilidade com URLs externas
- Interface intuitiva com drag & drop

