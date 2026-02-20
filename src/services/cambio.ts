export async function getDolarCotacao() {
    try {
        const response = await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL");
        const data = await response.json();
        return parseFloat(data.USDBRL.bid);
    } catch (error) {
        console.error("Erro ao buscar cotação:", error);
        return 5.15; // Fallback
    }
}
