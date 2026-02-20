-- Criar o bucket 'produtos' se não existir
insert into storage.buckets (id, name, public)
values ('produtos', 'produtos', true)
on conflict (id) do nothing;

-- Política para leitura pública (qualquer um pode ver as fotos)
create policy "Imagens de produtos são públicas"
on storage.objects for select
to public
using ( bucket_id = 'produtos' );

-- Política para upload (apenas usuários autenticados)
create policy "Usuários autenticados podem fazer upload de imagens"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'produtos' );

-- Política para update/delete (usuário dono do arquivo ou admin)
-- Para simplificar, permitimos a usuários logados alterar os arquivos do bucket
create policy "Usuários podem atualizar/deletar imagens"
on storage.objects for update
to authenticated
using ( bucket_id = 'produtos' );

create policy "Usuários podem deletar imagens"
on storage.objects for delete
to authenticated
using ( bucket_id = 'produtos' );
