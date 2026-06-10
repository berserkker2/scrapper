const cheerio = require('cheerio');

module.exports = async (req, res) => {
    // 1. Configuração Robusta de CORS (Enviada logo no início para o browser nunca bloquear)
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // Responde imediatamente a pedidos de validação do browser
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido.' });
    }

    const { url, seletor_preco, seletor_imagem } = req.body;

    if (!url || !seletor_preco) {
        return res.status(400).json({ error: 'URL e seletor_preco são obrigatórios.' });
    }

    try {
        // 2. Usamos o fetch nativo do Node.js (Sem imports externos para evitar Erro 500)
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'pt-PT,pt;q=0.9,en-US;q=0.8,en;q=0.7'
            }
        });

        if (!response.ok) {
            return res.status(200).json({
                sucesso: true,
                preco: 0,
                originalPreco: `Bloqueado pela Loja (${response.status})`,
                imagem: 'https://placehold.co/100x100?text=Bloqueado'
            });
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // Extração do preço
        const precoTexto = $(seletor_preco).text().trim();
        const precoLimpo = precoTexto.replace(/[^\d.,]/g, '').replace(',', '.');
        const precoNumerico = parseFloat(precoLimpo);

        // Extração da Imagem
        let urlImagem = '';
        if (seletor_imagem) {
            if (seletor_imagem.includes('meta')) {
                urlImagem = $(seletor_imagem).attr('content');
            } else {
                urlImagem = $(seletor_imagem).attr('src') || $(seletor_imagem).attr('data-src');
            }
        }

        // Plano B para a imagem caso falhe o seletor
        if (!urlImagem) {
            urlImagem = $('meta[property="og:image"]').attr('content');
        }

        return res.status(200).json({
            sucesso: true,
            preco: precoNumerico || 0,
            originalPreco: precoTexto || "Não encontrado",
            imagem: urlImagem || 'https://placehold.co/100x100?text=Sem+Imagem'
        });

    } catch (error) {
        // Se houver erro de extração, capturamos aqui sem crashar o servidor
        return res.status(200).json({
            sucesso: true,
            preco: 0,
            originalPreco: "Erro ao ler a página",
            imagem: 'https://placehold.co/100x100?text=Erro+Scraper'
        });
    }
};
