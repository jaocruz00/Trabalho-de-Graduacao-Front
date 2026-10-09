document.addEventListener("DOMContentLoaded", () => {
    // URL base do backend Spring Boot.
    // Se o front for servido pelo mesmo domínio do backend, pode trocar para "".
    const API_BASE = "http://localhost:8080";

    const $ = (id) => document.getElementById(id);

    const arquivo = $("arquivo");
    const uploadArea = $("uploadArea");
    const selectFile = $("selectFile");
    const fileName = $("fileName");
    const processing = $("processing");
    const feedback = $("feedback");
    const clienteForm = $("clienteForm");
    const btnGerar = $("btnGerar");
    const modeloJuridico = $("modeloJuridico");
    const apiStatus = $("apiStatus");
    const sidebar = document.querySelector(".sidebar");

    let clientes = [];

    function showFeedback(message, type = "success") {
        feedback.textContent = message;
        feedback.className = `feedback show ${type}`;
    }

    function clearFeedback() {
        feedback.textContent = "";
        feedback.className = "feedback";
    }

    function setProcessing(active) {
        processing.hidden = !active;
        uploadArea.style.pointerEvents = active ? "none" : "";
        uploadArea.style.opacity = active ? ".65" : "1";
    }

    function maskCPF(value) {
        value = value.replace(/\D/g, "").slice(0, 11);
        value = value.replace(/(\d{3})(\d)/, "$1.$2");
        value = value.replace(/(\d{3})(\d)/, "$1.$2");
        value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
        return value;
    }

    function maskRG(value) {
        value = value.replace(/\D/g, "").slice(0, 9);
        value = value.replace(/(\d{2})(\d)/, "$1.$2");
        value = value.replace(/(\d{3})(\d)/, "$1.$2");
        value = value.replace(/(\d{3})(\d)$/, "$1-$2");
        return value;
    }

    function maskDate(value) {
        value = value.replace(/\D/g, "").slice(0, 8);
        value = value.replace(/(\d{2})(\d)/, "$1/$2");
        value = value.replace(/(\d{2})(\d)/, "$1/$2");
        return value;
    }

    $("cpf").addEventListener("input", e => e.target.value = maskCPF(e.target.value));
    $("rg").addEventListener("input", e => e.target.value = maskRG(e.target.value));
    $("nascimento").addEventListener("input", e => e.target.value = maskDate(e.target.value));

    function preencherFormulario(cliente) {
        $("nome").value = cliente?.nome || "";
        $("cpf").value = maskCPF(cliente?.cpf || "");
        $("rg").value = maskRG(cliente?.rg || "");
        $("filiacao").value = cliente?.filiacao || "";
        $("orgaoExpedidor").value = cliente?.orgaoExpedidor || "";

        if (cliente?.dataNascimento) {
            const [ano, mes, dia] = String(cliente.dataNascimento).split("-");
            $("nascimento").value = dia && mes && ano ? `${dia}/${mes}/${ano}` : cliente.dataNascimento;
        } else {
            $("nascimento").value = "";
        }
    }

    function getFileFromEvent(event) {
        return event.dataTransfer?.files?.[0] || event.target?.files?.[0] || null;
    }

    function validarArquivo(file) {
        if (!file) return false;

        const tipos = ["application/pdf", "image/jpeg", "image/png"];
        const extensaoValida = /\.(pdf|jpe?g|png)$/i.test(file.name);

        if (!tipos.includes(file.type) && !extensaoValida) {
            showFeedback("Arquivo inválido. Envie PDF, JPG, JPEG ou PNG.", "error");
            return false;
        }

        if (file.size > 5 * 1024 * 1024) {
            showFeedback("O arquivo ultrapassa o limite de 5 MB do backend.", "error");
            return false;
        }

        return true;
    }

    async function enviarDocumento(file) {
        if (!validarArquivo(file)) return;

        clearFeedback();
        fileName.textContent = `${file.name} • ${(file.size / 1024 / 1024).toFixed(2)} MB`;
        setProcessing(true);

        try {
            const formData = new FormData();
            formData.append("arquivo", file);

            const response = await fetch(`${API_BASE}/api/documentos/cliente`, {
                method: "POST",
                body: formData
            });

            if (!response.ok) {
                let detalhe = `Erro HTTP ${response.status}`;
                try {
                    const body = await response.json();
                    if (body?.message) detalhe = body.message;
                } catch (_) {}
                throw new Error(detalhe);
            }

            const cliente = await response.json();

            preencherFormulario(cliente);

            showFeedback(
                `Documento processado. Cliente ${cliente?.nome ? `"${cliente.nome}"` : ""} foi carregado no formulário.`,
                "success"
            );
        } catch (error) {
            console.error(error);
            showFeedback(
                "Não foi possível processar o documento. Verifique se o Spring Boot está rodando e se o endpoint está acessível.",
                "error"
            );
        } finally {
            setProcessing(false);
        }
    }

    uploadArea.addEventListener("click", (event) => {
        if (event.target.closest(".link-button")) return;
        arquivo.click();
    });

    selectFile.addEventListener("click", (event) => {
        event.stopPropagation();
        arquivo.click();
    });

    uploadArea.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            arquivo.click();
        }
    });

    arquivo.addEventListener("change", () => {
        const file = arquivo.files[0];
        if (file) enviarDocumento(file);
    });

    ["dragenter", "dragover"].forEach(type => {
        uploadArea.addEventListener(type, event => {
            event.preventDefault();
            uploadArea.classList.add("dragover");
        });
    });

    ["dragleave", "drop"].forEach(type => {
        uploadArea.addEventListener(type, event => {
            event.preventDefault();
            uploadArea.classList.remove("dragover");
        });
    });

    uploadArea.addEventListener("drop", event => {
        const file = getFileFromEvent(event);
        if (file) enviarDocumento(file);
    });

    clienteForm.addEventListener("submit", async event => {
        event.preventDefault();
        clearFeedback();

        const id = clienteForm.dataset.clienteId;
        const dados = {
            nome: $("nome").value.trim(),
            cpf: $("cpf").value.trim(),
            rg: $("rg").value.trim(),
            dataNascimento: converterDataParaISO($("nascimento").value.trim()),
            filiacao: $("filiacao").value.trim(),
            orgaoExpedidor: $("orgaoExpedidor").value.trim()
        };

        if (!dados.nome || !dados.cpf) {
            showFeedback("Preencha pelo menos nome e CPF antes de salvar.", "error");
            return;
        }

        try {
            let response;

            if (id) {
                response = await fetch(`${API_BASE}/api/clientes/${id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(dados)
                });
            } else {
                response = await fetch(`${API_BASE}/api/clientes`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(dados)
                });
            }

            if (!response.ok) throw new Error(`Erro HTTP ${response.status}`);

            const cliente = await response.json();
            clienteForm.dataset.clienteId = cliente.id || id || "";
            preencherFormulario(cliente);
            showFeedback("Dados salvos com sucesso no backend.", "success");
        } catch (error) {
            console.error(error);
            showFeedback("Não foi possível salvar. Verifique o endpoint /api/clientes.", "error");
        }
    });

    function converterDataParaISO(data) {
        const partes = data.split("/");
        if (partes.length !== 3) return null;
        return `${partes[2]}-${partes[1].padStart(2, "0")}-${partes[0].padStart(2, "0")}`;
    }

    modeloJuridico.addEventListener("change", () => {
        btnGerar.disabled = modeloJuridico.value === "";
    });

    btnGerar.addEventListener("click", () => {
        showFeedback(
            "O modelo foi selecionado. O backend atual ainda não possui um endpoint de geração de documentos; o botão está preparado para a próxima etapa.",
            "success"
        );
    });

    async function carregarClientes() {
        const lista = $("clientesList");
        lista.innerHTML = '<div class="empty-state">Carregando clientes...</div>';

        try {
            const response = await fetch(`${API_BASE}/api/clientes`);
            if (!response.ok) throw new Error(`Erro HTTP ${response.status}`);

            clientes = await response.json();
            renderClientes(clientes);
        } catch (error) {
            console.error(error);
            lista.innerHTML = '<div class="empty-state">Não foi possível carregar os clientes.</div>';
        }
    }

    function renderClientes(items) {
        const lista = $("clientesList");

        if (!items.length) {
            lista.innerHTML = '<div class="empty-state">Nenhum cliente encontrado.</div>';
            return;
        }

        lista.innerHTML = items.map(cliente => `
            <div class="client-row">
                <div>
                    <strong>${escapeHTML(cliente.nome || "Sem nome")}</strong>
                    <span>CPF: ${escapeHTML(cliente.cpf || "Não informado")}</span>
                </div>
                <button class="btn btn-secondary btn-edit-client" type="button" data-id="${cliente.id}">
                    Editar
                </button>
            </div>
        `).join("");

        document.querySelectorAll(".btn-edit-client").forEach(button => {
            button.addEventListener("click", () => carregarCliente(button.dataset.id));
        });
    }

    async function carregarCliente(id) {
        try {
            const response = await fetch(`${API_BASE}/api/clientes/${id}`);
            if (!response.ok) throw new Error(`Erro HTTP ${response.status}`);

            const cliente = await response.json();
            preencherFormulario(cliente);
            clienteForm.dataset.clienteId = cliente.id;
            abrirSecao("extracao");
            showFeedback("Cliente carregado para edição.", "success");
        } catch (error) {
            console.error(error);
            showFeedback("Não foi possível carregar o cliente.", "error");
        }
    }

    $("buscaCliente").addEventListener("input", event => {
        const termo = event.target.value.toLowerCase().trim();

        const filtrados = clientes.filter(cliente =>
            String(cliente.nome || "").toLowerCase().includes(termo) ||
            String(cliente.cpf || "").toLowerCase().includes(termo)
        );

        renderClientes(filtrados);
    });

    $("btnAtualizarClientes").addEventListener("click", carregarClientes);

    function abrirSecao(section) {
        document.querySelectorAll(".page-section").forEach(el => el.classList.add("hidden"));
        $(section).classList.remove("hidden");

        document.querySelectorAll(".nav-item").forEach(item => {
            item.classList.toggle("active", item.dataset.section === section);
        });

        if (section === "clientes") carregarClientes();
    }

    document.querySelectorAll(".nav-item[data-section]").forEach(item => {
        item.addEventListener("click", event => {
            event.preventDefault();
            abrirSecao(item.dataset.section);
            sidebar.classList.remove("open");
        });
    });

    $("menuButton").addEventListener("click", () => {
        sidebar.classList.toggle("open");
    });

    function escapeHTML(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    async function verificarBackend() {
        try {
            const response = await fetch(`${API_BASE}/api/clientes`, { method: "GET" });
            apiStatus.classList.toggle("online", response.ok);
            apiStatus.classList.toggle("offline", !response.ok);
            apiStatus.lastChild.textContent = response.ok ? " Backend conectado" : " Backend indisponível";
        } catch (_) {
            apiStatus.classList.remove("online");
            apiStatus.classList.add("offline");
            apiStatus.lastChild.textContent = " Backend indisponível";
        }
    }

    verificarBackend();
});
