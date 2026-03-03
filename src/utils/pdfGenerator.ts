import jsPDF from "jspdf";
import "jspdf-autotable";
import { formatCurrency } from "./formatCurrency";
import { formatDate } from "./formatDate";

// Extend jsPDF with autoTable for TS
declare module "jspdf" {
    interface jsPDF {
        autoTable: (options: any) => jsPDF;
    }
}

interface PDFBranding {
    razao_social?: string;
    nome_fantasia?: string;
    cnpj?: string;
    logradouro?: string;
    numero?: string;
    bairro?: string;
    municipio?: string;
    uf?: string;
    telefone?: string;
    email?: string;
    logo_url?: string | null;
}

const getBase64ImageFromUrl = async (imageUrl: string): Promise<string> => {
    const res = await fetch(imageUrl);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export const generateSOPDF = async (os: any, branding?: PDFBranding) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let startX = margin;

    // --- Logo ---
    if (branding?.logo_url) {
        try {
            const logoBase64 = await getBase64ImageFromUrl(branding.logo_url);
            doc.addImage(logoBase64, "PNG", margin, 15, 30, 15);
            startX = margin + 35; // Shift text to right
        } catch (error) {
            console.error("Erro ao carregar logo para o PDF", error);
        }
    }

    // --- Header ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text(branding?.nome_fantasia || "SmartOS ERP", startX, 20);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const address = `${branding?.logradouro || ""}, ${branding?.numero || ""} - ${branding?.bairro || ""} - ${branding?.municipio || ""}/${branding?.uf || ""}`;
    doc.text(address, startX, 26);
    doc.text(`CNPJ: ${branding?.cnpj || "N/I"} | Tel: ${branding?.telefone || "N/I"}`, startX, 31);

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`ORDEM DE SERVIÇO Nº ${String(os.numero).padStart(5, '0')}`, pageWidth - 15, 20, { align: "right" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Status: ${os.status.toUpperCase()}`, pageWidth - 15, 26, { align: "right" });
    doc.text(`Data: ${formatDate(os.created_at)}`, pageWidth - 15, 31, { align: "right" });

    doc.setLineWidth(0.5);
    doc.line(margin, 35, pageWidth - margin, 35);

    // --- Customer Section ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("DADOS DO CLIENTE", margin, 45);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Nome: ${os.cliente?.nome || "N/I"}`, margin, 52);
    doc.text(`Telefone: ${os.cliente?.telefone || "N/I"}`, margin, 57);
    doc.text(`CPF/CNPJ: ${os.cliente?.cpf_cnpj || "N/I"}`, margin, 62);
    doc.text(`Endereço: ${os.cliente?.logradouro || "N/I"}, ${os.cliente?.numero || ""} ${os.cliente?.bairro || ""}`, margin, 67);

    // --- Equipment Section ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("EQUIPAMENTO", pageWidth / 2, 45);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Marca/Modelo: ${os.marca_equipamento || os.equipamento?.marca || ""} ${os.modelo_equipamento || os.equipamento?.modelo || ""}`, pageWidth / 2, 52);
    doc.text(`IMEI/Serial: ${os.imei_equipamento || os.equipamento?.imei || os.numero_serie || "N/I"}`, pageWidth / 2, 57);
    doc.text(`Senha: ${os.senha_dispositivo || "N/I"}`, pageWidth / 2, 62);

    doc.line(margin, 75, pageWidth - margin, 75);

    // --- Problem Section ---
    doc.setFont("helvetica", "bold");
    doc.text("PROBLEMA RELATADO:", margin, 85);
    doc.setFont("helvetica", "normal");
    const problemaLines = doc.splitTextToSize(os.problema_relatado || "N/I", pageWidth - margin * 2);
    doc.text(problemaLines, margin, 92);

    let currentY = 92 + (problemaLines.length * 5) + 5;

    if (os.diagnostico) {
        doc.setFont("helvetica", "bold");
        doc.text("DIAGNÓSTICO TÉCNICO:", margin, currentY);
        doc.setFont("helvetica", "normal");
        const diagLines = doc.splitTextToSize(os.diagnostico, pageWidth - margin * 2);
        doc.text(diagLines, margin, currentY + 7);
        currentY += (diagLines.length * 5) + 12;
    }

    // --- Items Table ---
    const items: any[][] = [];
    const pecas = Array.isArray(os.pecas_json) ? os.pecas_json : [];
    const servicos = Array.isArray(os.mao_obra_json) ? os.mao_obra_json : [];

    pecas.forEach((p: any) => {
        items.push(["Peça", p.nome, p.qtd || 1, formatCurrency(p.preco || p.valor), formatCurrency((p.preco || p.valor) * (p.qtd || 1))]);
    });

    servicos.forEach((s: any) => {
        items.push(["Serviço", s.descricao, 1, formatCurrency(s.valor), formatCurrency(s.valor)]);
    });

    if (items.length > 0) {
        doc.autoTable({
            startY: currentY,
            head: [['Tipo', 'Descrição', 'Qtd', 'V. Unit', 'Subtotal']],
            body: items,
            theme: 'striped',
            headStyles: { fillColor: [79, 70, 229] }, // Indigo 600
        });
        currentY = (doc as any).lastAutoTable.finalY + 10;
    } else {
        currentY += 10;
    }

    // --- Summary ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);

    if (os.valor_adiantado_centavos > 0) {
        doc.text("SUBTOTAL:", pageWidth - margin - 50, currentY, { align: "right" });
        doc.text(formatCurrency(os.valor_total_centavos), pageWidth - margin, currentY, { align: "right" });
        currentY += 6;

        doc.text("ADIANTAMENTO:", pageWidth - margin - 50, currentY, { align: "right" });
        doc.text(`- ${formatCurrency(os.valor_adiantado_centavos)}`, pageWidth - margin, currentY, { align: "right" });
        currentY += 7;

        doc.setFontSize(14);
        doc.text("SALDO A PAGAR:", pageWidth - margin - 50, currentY, { align: "right" });
        doc.text(formatCurrency(os.valor_total_centavos - (os.valor_adiantado_centavos || 0)), pageWidth - margin, currentY, { align: "right" });
    } else {
        doc.setFontSize(14);
        doc.text("TOTAL ESTIMADO:", pageWidth - margin - 50, currentY, { align: "right" });
        doc.text(formatCurrency(os.valor_total_centavos), pageWidth - margin, currentY, { align: "right" });
    }

    // --- Footer Terms ---
    const footerY = doc.internal.pageSize.getHeight() - 60;
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    const terms = "O cliente declara estar ciente que a manutenção em dispositivos eletrônicos pode acarretar na perda de garantia do fabricante. A loja não se responsabiliza por falhas pré-existentes não relatadas. O prazo para retirada é de 90 dias, após o qual o aparelho poderá ser alienado para custeio. A garantia de 90 dias cobre exclusivamente as peças trocadas e o serviço realizado.";
    const termLines = doc.splitTextToSize(terms, pageWidth - margin * 2);
    doc.text(termLines, margin, footerY);

    // --- Signatures ---
    doc.setLineWidth(0.2);
    doc.line(margin, footerY + 25, margin + 80, footerY + 25);
    doc.line(pageWidth - margin - 80, footerY + 25, pageWidth - margin, footerY + 25);
    doc.setFont("helvetica", "bold");
    doc.text("ASSINATURA DO CLIENTE", margin + 40, footerY + 30, { align: "center" });
    doc.text("VISTO DA RECEPÇÃO", pageWidth - margin - 40, footerY + 30, { align: "center" });

    doc.save(`OS_${String(os.numero).padStart(5, '0')}.pdf`);
};

export const generateVendaPDF = async (venda: any, branding?: PDFBranding) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let startX = margin;

    // --- Logo ---
    if (branding?.logo_url) {
        try {
            const logoBase64 = await getBase64ImageFromUrl(branding.logo_url);
            doc.addImage(logoBase64, "PNG", margin, 15, 30, 15);
            startX = margin + 35; // Shift text to right
        } catch (error) {
            console.error("Erro ao carregar logo para o PDF", error);
        }
    }

    // --- Header ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text(branding?.nome_fantasia || "SmartOS ERP", startX, 20);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const address = `${branding?.logradouro || ""}, ${branding?.numero || ""} - ${branding?.bairro || ""} - ${branding?.municipio || ""}/${branding?.uf || ""}`;
    doc.text(address, startX, 26);
    doc.text(`CNPJ: ${branding?.cnpj || "N/I"} | Tel: ${branding?.telefone || "N/I"}`, startX, 31);

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`VENDA Nº ${String(venda.numero || venda.id.substring(0, 8)).toUpperCase()}`, pageWidth - 15, 20, { align: "right" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Data: ${formatDate(venda.created_at)}`, pageWidth - 15, 26, { align: "right" });

    doc.setLineWidth(0.5);
    doc.line(margin, 35, pageWidth - margin, 35);

    // --- Customer Section ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("DADOS DO CLIENTE", margin, 45);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Nome: ${venda.cliente?.nome || "Consumidor Final"}`, margin, 52);
    doc.text(`Telefone: ${venda.cliente?.telefone || "N/I"}`, margin, 57);
    doc.text(`Endereço: ${venda.cliente?.logradouro || "N/I"}, ${venda.cliente?.numero || ""} ${venda.cliente?.bairro || ""}`, margin, 62);

    const items: any[][] = (venda.itens_json || []).map((item: any) => [
        item.nome,
        item.qtd,
        formatCurrency(item.preco_unitario_centavos),
        formatCurrency(item.subtotal_centavos)
    ]);

    doc.autoTable({
        startY: 75,
        head: [['Produto', 'Qtd', 'V. Unit', 'Subtotal']],
        body: items,
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129] }, // Emerald 500
    });

    let currentY = (doc as any).lastAutoTable.finalY + 10;

    // --- Summary ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);

    if (venda.desconto_centavos > 0) {
        doc.setFontSize(10);
        doc.text("Subtotal:", pageWidth - margin - 50, currentY, { align: "right" });
        doc.text(formatCurrency(venda.valor_total_centavos + venda.desconto_centavos), pageWidth - margin, currentY, { align: "right" });
        currentY += 5;
        doc.text("Desconto:", pageWidth - margin - 50, currentY, { align: "right" });
        doc.text(`- ${formatCurrency(venda.desconto_centavos)}`, pageWidth - margin, currentY, { align: "right" });
        currentY += 7;
    }

    doc.setFontSize(14);
    doc.text("TOTAL:", pageWidth - margin - 50, currentY, { align: "right" });
    doc.text(formatCurrency(venda.valor_total_centavos), pageWidth - margin, currentY, { align: "right" });

    doc.save(`Venda_${venda.id.substring(0, 8)}.pdf`);
};
