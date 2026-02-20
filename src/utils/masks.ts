/**
 * Utilitários para aplicar máscaras em campos de input em tempo real
 */

export const maskPhone = (value: string) => {
    if (!value) return "";
    value = value.replace(/\D/g, "");
    value = value.replace(/^(\d{2})(\d)/g, "($1) $2");
    value = value.replace(/(\d{5})(\d)/, "$1-$2");
    return value.substring(0, 15);
};

export const maskCPF = (value: string) => {
    if (!value) return "";
    value = value.replace(/\D/g, "");
    if (value.length <= 11) {
        // CPF
        value = value.replace(/(\d{3})(\d)/, "$1.$2");
        value = value.replace(/(\d{3})(\d)/, "$1.$2");
        value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    } else {
        // CNPJ
        value = value.replace(/^(\d{2})(\d)/, "$1.$2");
        value = value.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
        value = value.replace(/\.(\d{3})(\d)/, ".$1/$2");
        value = value.replace(/(\d{4})(\d)/, "$1-$2");
    }
    return value.substring(0, 18);
};

export const maskCEP = (value: string) => {
    if (!value) return "";
    value = value.replace(/\D/g, "");
    value = value.replace(/(\d{5})(\d)/, "$1-$2");
    return value.substring(0, 9);
};

export const unmask = (value: string) => {
    return value.replace(/\D/g, "");
};
