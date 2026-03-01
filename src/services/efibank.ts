/**
 * EfíBank API Wrapper
 * Documentação: https://dev.efipay.com.br/docs/api-cobrancas/
 */

interface EfiBankConfig {
    clientId: string;
    clientSecret: string;
    sandbox: boolean;
}

interface EfiBankCustomer {
    name: string;
    cpf?: string;
    email?: string;
    phone_number?: string;
    address?: {
        street: string;
        number: string;
        neighborhood: string;
        zipcode: string;
        city: string;
        complement?: string;
        state: string;
    };
    juridical_person?: {
        corporate_name: string;
        cnpj: string;
    };
}

interface CriarCarneParams {
    items: Array<{ name: string; value: number; amount: number }>;
    customer: EfiBankCustomer;
    expire_at: string; // YYYY-MM-DD (1ª parcela)
    repeats: number;
    split_items?: boolean;
    configurations?: {
        fine?: number;      // multa em centavos (200 = 2%)
        interest?: number;  // juros diários (33 = 0.033%)
    };
    message?: string;
    metadata?: {
        custom_id?: string;
        notification_url?: string;
    };
}

interface CarneCharge {
    charge_id: number;
    parcel: string;
    status: string;
    value: number;
    expire_at: string;
    url?: string;
    parcel_link?: string;
    barcode?: string;
    pix?: {
        qrcode?: string;
        qrcode_image?: string;
    };
    pdf?: {
        charge?: string;
    };
}

interface CarneResponse {
    code: number;
    data: {
        carnet_id: number;
        status: string;
        cover?: string;
        link?: string;
        carnet_link?: string;
        pdf?: {
            carnet?: string;
            cover?: string;
        };
        charges: CarneCharge[];
    };
}

interface ChargeResponse {
    code: number;
    data: {
        charge_id: number;
        total: number;
        status: string;
        custom_id?: string;
        created_at: string;
        payment?: {
            method: string;
            banking_billet?: {
                barcode: string;
                link: string;
                expire_at: string;
                pix?: {
                    qrcode: string;
                    qrcode_image: string;
                };
            };
        };
    };
}

const BASE_URL_PRODUCTION = "https://cobrancas.api.efipay.com.br";
const BASE_URL_SANDBOX = "https://cobrancas-h.api.efipay.com.br";

/**
 * Obtém token de autenticação OAuth2 da EfíBank
 */
export async function autenticar(config: EfiBankConfig): Promise<string> {
    const baseUrl = config.sandbox ? BASE_URL_SANDBOX : BASE_URL_PRODUCTION;
    const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");

    const res = await fetch(`${baseUrl}/v1/authorize`, {
        method: "POST",
        headers: {
            "Authorization": `Basic ${credentials}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ grant_type: "client_credentials" }),
    });

    if (!res.ok) {
        const error = await res.text();
        throw new Error(`EfíBank Auth Error: ${res.status} - ${error}`);
    }

    const data = await res.json();
    return data.access_token;
}

/**
 * Cria um carnê (conjunto de boletos parcelados) na EfíBank
 */
export async function criarCarne(config: EfiBankConfig, params: CriarCarneParams): Promise<CarneResponse> {
    const token = await autenticar(config);
    const baseUrl = config.sandbox ? BASE_URL_SANDBOX : BASE_URL_PRODUCTION;

    const body: any = {
        items: params.items,
        customer: params.customer,
        expire_at: params.expire_at,
        repeats: params.repeats,
        split_items: params.split_items ?? false,
    };

    if (params.configurations) {
        body.configurations = params.configurations;
    }
    if (params.message) {
        body.message = params.message;
    }
    if (params.metadata) {
        body.metadata = params.metadata;
    }

    const res = await fetch(`${baseUrl}/v1/carnet`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const error = await res.text();
        throw new Error(`EfíBank Carnê Error: ${res.status} - ${error}`);
    }

    return await res.json();
}

/**
 * Consulta informações de um carnê existente
 */
export async function consultarCarne(config: EfiBankConfig, carnetId: number): Promise<any> {
    const token = await autenticar(config);
    const baseUrl = config.sandbox ? BASE_URL_SANDBOX : BASE_URL_PRODUCTION;

    const res = await fetch(`${baseUrl}/v1/carnet/${carnetId}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` },
    });

    if (!res.ok) throw new Error(`EfíBank: Erro ao consultar carnê ${carnetId}`);
    return await res.json();
}

/**
 * Consulta informações de uma cobrança (parcela) específica
 */
export async function consultarCobranca(config: EfiBankConfig, chargeId: number): Promise<ChargeResponse> {
    const token = await autenticar(config);
    const baseUrl = config.sandbox ? BASE_URL_SANDBOX : BASE_URL_PRODUCTION;

    const res = await fetch(`${baseUrl}/v1/charge/${chargeId}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` },
    });

    if (!res.ok) throw new Error(`EfíBank: Erro ao consultar cobrança ${chargeId}`);
    return await res.json();
}

/**
 * Marca uma cobrança como paga (baixa manual)
 */
export async function baixaManual(config: EfiBankConfig, chargeId: number): Promise<void> {
    const token = await autenticar(config);
    const baseUrl = config.sandbox ? BASE_URL_SANDBOX : BASE_URL_PRODUCTION;

    const res = await fetch(`${baseUrl}/v1/charge/${chargeId}/settle`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` },
    });

    if (!res.ok) throw new Error(`EfíBank: Erro na baixa manual da cobrança ${chargeId}`);
}

/**
 * Cancela um carnê inteiro
 */
export async function cancelarCarne(config: EfiBankConfig, carnetId: number): Promise<void> {
    const token = await autenticar(config);
    const baseUrl = config.sandbox ? BASE_URL_SANDBOX : BASE_URL_PRODUCTION;

    const res = await fetch(`${baseUrl}/v1/carnet/${carnetId}/cancel`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` },
    });

    if (!res.ok) throw new Error(`EfíBank: Erro ao cancelar carnê ${carnetId}`);
}

/**
 * Cancela uma parcela específica de um carnê
 */
export async function cancelarParcela(config: EfiBankConfig, chargeId: number): Promise<void> {
    const token = await autenticar(config);
    const baseUrl = config.sandbox ? BASE_URL_SANDBOX : BASE_URL_PRODUCTION;

    const res = await fetch(`${baseUrl}/v1/charge/${chargeId}/cancel`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` },
    });

    if (!res.ok) throw new Error(`EfíBank: Erro ao cancelar parcela ${chargeId}`);
}

export type { EfiBankConfig, EfiBankCustomer, CriarCarneParams, CarneResponse, CarneCharge, ChargeResponse };
