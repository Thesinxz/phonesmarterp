async function run() {
    try {
        const res = await fetch("http://localhost:3000/api/vitrine/minhaloja/produtos", {
            headers: { "Cache-Control": "no-cache" }
        });
        const text = await res.text();
        console.log("Status:", res.status);
        console.log("Response:", text.substring(0, 1000));
    } catch (e) {
        console.error("Fetch error:", e);
    }
}
run();
