const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

//app.use(cors());


// Modelos de tu flota 737 series 
const FLOTA_MODELOS = ["737-700", "737-800", "737-8", "737-9", "737-10"];

function parseAndFilterAD(doc) {
    const title = doc.title || "";
    const abstract = doc.abstract || "";
    const fullText = `${title} ${abstract}`.toLowerCase();
    
    const componentKeywords = [
        "engine", "propeller", "generator", "valve", "sensor", 
        "apu", "landing gear", "component", "part", "fuel pump", "actuator", "cfm", "rr trent"
    ];

    const matchesFleet = FLOTA_MODELOS.some(modelo => fullText.includes(modelo));
    const isComponent = componentKeywords.some(kw => fullText.includes(kw));

    if (matchesFleet) {
        return {
            id: doc.document_number,
            number: doc.document_number,
            status: "Pending",
            subject: title.length > 60 ? title.substring(0, 60) + "..." : title,
            publishDate: doc.publication_date,
            effectiveDate: doc.effective_on || doc.publication_date,
            make: "The Boeing Company",
            model: "737",
            cfr: "14 CFR Part 39",
            type: "aircraft",
            description: doc.abstract || "Sin descripción detallada disponible.",
            summary: title,
            link: doc.html_url,
            notes: "",
            createdAt: new Date().toISOString()
        };
    } else if (isComponent) {
        return {
            id: doc.document_number,
            number: doc.document_number,
            status: "Pending",
            subject: title.length > 60 ? title.substring(0, 60) + "..." : title,
            publishDate: doc.publication_date,
            effectiveDate: doc.effective_on || doc.publication_date,
            make: "",
            model: "",
            cfr: "14 CFR Part 39",
            type: "component",
            description: doc.abstract || "AD dirigida a componente o equipo.",
            summary: title,
            link: doc.html_url,
            notes: "Verificar si el componente se encuentra en el inventario.",
            createdAt: new Date().toISOString()
        };
    }

    return null;
}

app.get('/api/ads', async (req, res) => {
    try {
        const faaUrl = 'https://www.federalregister.gov/api/v1/documents.json?conditions[agencies][]=federal-aviation-administration&conditions[term]=Airworthiness Directives';
        
        const apiResponse = await fetch(faaUrl);
        const data = await apiResponse.json();

        if (!data.results) return res.json([]);

        const filteredADs = data.results
            .map(doc => parseAndFilterAD(doc))
            .filter(Boolean);

        res.json(filteredADs);
    } catch (err) {
        console.error("Error al obtener ADs de la FAA:", err);
        res.status(500).json({ error: "Error al sincronizar datos oficiales." });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor de integración 737 FAA corriendo en http://localhost:${PORT}`);
});
