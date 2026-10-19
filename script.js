// =============================================================================
// Conexão com o Supabase (Substitua com seus dados de Project Settings > API)
// =============================================================================
const SUPABASE_URL = 'https://khbkldsrupxjtnkngffx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoYmtsZHNydXB4anRua25nZmZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzNjM1MDksImV4cCI6MjEwNzkzOTUwOX0.MwW0PLrvaBvr0w6UFfH7izBKSGaEP_qhxfATt9WXD30';

// Usamos _supabase para evitar conflito com a variável global 'supabase' do CDN
const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Elementos da interface (DOM)
const livroForm = document.getElementById('livroForm');
const idLivroInput = document.getElementById('idLivro');
const tituloInput = document.getElementById('titulo');
const autorInput = document.getElementById('autor');
const generoInput = document.getElementById('genero');
const statusInput = document.getElementById('status');
const notaInput = document.getElementById('nota');
const resenhaInput = document.getElementById('resenha');
const tituloForm = document.getElementById('tituloForm');
const btnCancelar = document.getElementById('btnCancelar');
const tabelaLivros = document.getElementById('tabelaLivros');

// =============================================================================
// 1. READ (Consultar e listar os livros)
// =============================================================================
async function carregarLivros() {
  tabelaLivros.innerHTML = '<tr><td colspan="7" class="aviso-vazio">Buscando livros...</td></tr>';

  try {
    const { data: livros, error } = await _supabase
      .from('livros')
      .select('*')
      .order('id', { ascending: false });

    if (error) {
      console.error('Erro no SELECT:', error);
      tabelaLivros.innerHTML = `<tr><td colspan="7" class="aviso-vazio" style="color: #dc2626;">Erro ao carregar: ${error.message}</td></tr>`;
      return;
    }

    if (!livros || livros.length === 0) {
      tabelaLivros.innerHTML = '<tr><td colspan="7" class="aviso-vazio">Nenhum livro avaliado ainda. Preencha o formulário acima!</td></tr>';
      return;
    }

    tabelaLivros.innerHTML = '';
    livros.forEach((livro) => {
      const tr = document.createElement('tr');

      // Formatação visual da nota em estrelas
      const estrelas = livro.nota ? '⭐'.repeat(livro.nota) : '<span style="color: #94a3b8;">Sem nota</span>';

      // Classe visual do badge de status
      let classeStatus = 'status-quero-ler';
      if (livro.status === 'Lido') classeStatus = 'status-lido';
      if (livro.status === 'Lendo') classeStatus = 'status-lendo';

      tr.innerHTML = `
        <td>${livro.id}</td>
        <td>
          <strong>${escapeHtml(livro.titulo)}</strong>
          ${livro.genero ? `<br><small style="color: #64748b;">(${escapeHtml(livro.genero)})</small>` : ''}
        </td>
        <td>${escapeHtml(livro.autor)}</td>
        <td><span class="badge-status ${classeStatus}">${escapeHtml(livro.status)}</span></td>
        <td class="nota-estrelas">${estrelas}</td>
        <td style="max-width: 250px;">${escapeHtml(livro.resenha) || '<i style="color:#94a3b8;">Nenhum comentário</i>'}</td>
        <td>
          <button class="btn-acao btn-editar" onclick="prepararEdicao(${livro.id})">Editar</button>
          <button class="btn-acao btn-excluir" onclick="excluirLivro(${livro.id})">Excluir</button>
        </td>
      `;
      tabelaLivros.appendChild(tr);
    });
  } catch (err) {
    console.error('Falha de conexão com o Supabase:', err);
    tabelaLivros.innerHTML = `<tr><td colspan="7" class="aviso-vazio" style="color: #dc2626;">Erro inesperado: ${err.message}</td></tr>`;
  }
}

// =============================================================================
// 2. CREATE e UPDATE (Criar ou Atualizar)
// =============================================================================
livroForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = idLivroInput.value;
  const payload = {
    titulo: tituloInput.value.trim(),
    autor: autorInput.value.trim(),
    genero: generoInput.value.trim() || null,
    status: statusInput.value,
    nota: notaInput.value ? parseInt(notaInput.value, 10) : null,
    resenha: resenhaInput.value.trim() || null
  };

  try {
    if (id) {
      // UPDATE: atualiza onde id for igual
      const { data, error } = await _supabase
        .from('livros')
        .update(payload)
        .eq('id', id)
        .select();

      if (error) {
        alert('Erro ao atualizar: ' + error.message);
        return;
      }
      alert('Avaliação atualizada com sucesso!');
    } else {
      // CREATE: insere nova linha
      const { data, error } = await _supabase
        .from('livros')
        .insert([payload])
        .select();

      if (error) {
        alert('Erro ao cadastrar: ' + error.message);
        return;
      }
      alert('Livro registrado com sucesso!');
    }

    limparFormulario();
    carregarLivros(); // Recarrega a tabela imediatamente
  } catch (err) {
    console.error('Erro ao enviar:', err);
    alert('Erro inesperado: ' + err.message);
  }
});

// =============================================================================
// 3. DELETE (Excluir registro)
// =============================================================================
window.excluirLivro = async function(id) {
  const confirmacao = confirm(`Deseja realmente excluir o livro #${id}?`);
  if (!confirmacao) return;

  try {
    const { error } = await _supabase
      .from('livros')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Erro ao excluir: ' + error.message);
      return;
    }

    alert('Livro removido da estante!');
    carregarLivros(); // Atualiza a tabela
  } catch (err) {
    console.error('Erro na deleção:', err);
  }
};

// =============================================================================
// 4. Funções Auxiliares (Edição e Reset)
// =============================================================================
window.prepararEdicao = async function(id) {
  try {
    const { data: livro, error } = await _supabase
      .from('livros')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      alert('Erro ao carregar dados do livro: ' + error.message);
      return;
    }

    idLivroInput.value = livro.id;
    tituloInput.value = livro.titulo;
    autorInput.value = livro.autor;
    generoInput.value = livro.genero || '';
    statusInput.value = livro.status;
    notaInput.value = livro.nota !== null ? livro.nota : '';
    resenhaInput.value = livro.resenha || '';

    tituloForm.textContent = `Editando Livro #${livro.id} - ${livro.titulo}`;
    btnCancelar.style.display = 'inline-block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    console.error('Erro ao buscar livro:', err);
  }
};

function limparFormulario() {
  livroForm.reset();
  idLivroInput.value = '';
  tituloForm.textContent = 'Avaliar / Registrar Livro';
  btnCancelar.style.display = 'none';
}

btnCancelar.addEventListener('click', limparFormulario);

function escapeHtml(texto) {
  if (!texto) return '';
  const div = document.createElement('div');
  div.innerText = texto;
  return div.innerHTML;
}

// Execução inicial ao carregar a página
carregarLivros();