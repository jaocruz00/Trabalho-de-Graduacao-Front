document.addEventListener("DOMContentLoaded", () => {
    const inputCpf = document.getElementById("cpf");
    const inputRg = document.getElementById("rg");
    const inputNascimento = document.getElementById("nascimento");
    const selectModelo = document.getElementById("modeloJuridico");
    const btnGerarDoc = document.querySelector(".btn-generate");

    // ==========================================
    // 1. REGRAS DE VALIDAÇÃO E MÁSCARAS
    // ==========================================

    // Aplica restrição de apenas números e máscara de CPF (000.000.000-00)
    inputCpf.addEventListener("input", (e) => {
        let value = e.target.value.replace(/\D/g, ""); // Remove tudo o que não for número
        
        if (value.length > 11) value = value.slice(0, 11); // Limita a 11 dígitos
        
        // Aplica a estilização posicional dos pontos e traço
        value = value.replace(/(\d{3})(\d)/, "$1.$2");
        value = value.replace(/(\d{3})(\d)/, "$1.$2");
        value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
        
        e.target.value = value;
    });

    // Aplica restrição de apenas números e máscara de RG paulista padrão (00.151.623-4 ou similar)
    inputRg.addEventListener("input", (e) => {
        let value = e.target.value.replace(/\D/g, ""); // Remove tudo o que não for número
        
        if (value.length > 9) value = value.slice(0, 9); // Limita a 9 dígitos (padrão RG SP)
        
        // Aplica a estilização posicional do RG (00.000.000-0)
        value = value.replace(/(\d{2})(\d)/, "$1.$2");
        value = value.replace(/(\d{3})(\d)/, "$1.$2");
        value = value.replace(/(\d{3})(\d{1})$/, "$1-$2");
        
        e.target.value = value;
    });

    // Aplica restrição de apenas números e máscara de Data (DD/MM/AAAA)
    inputNascimento.addEventListener("input", (e) => {
        let value = e.target.value.replace(/\D/g, ""); // Remove tudo o que não for número
        
        if (value.length > 8) value = value.slice(0, 8); // Limita a 8 dígitos
        
        // Aplica as barras da data
        value = value.replace(/(\d{2})(\d)/, "$1/$2");
        value = value.replace(/(\d{2})(\d)/, "$1/$2");
        
        e.target.value = value;
    });

    // ==========================================
    // 2. CONTROLE DO BOTÃO "GERAR DOC"
    // ==========================================
    
    // O botão de gerar documento só deve ser habilitado se um modelo for selecionado
    selectModelo.addEventListener("change", () => {
        if (selectModelo.value !== "") {
            btnGerarDoc.removeAttribute("disabled");
            btnGerarDoc.style.backgroundColor = "#10b981"; // Muda para verde (sucesso)
            btnGerarDoc.style.color = "#ffffff";
            btnGerarDoc.style.cursor = "pointer";
        }
    });
});