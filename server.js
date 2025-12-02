// server.js
import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json()); // JSONボディをreq.bodyへ展開（Expressの組み込みミドルウェア）

// /public を静的配信（index.html, style.css, app.js）
app.use(express.static(path.join(__dirname, "public")));
app.use("/data", express.static(path.join(__dirname, "data")));


// チャット（調べ物）API: フロントからのテキストをOpenAIに転送して要約・回答
app.post("/api/chat", async (req, res) => {
    try {
        //req.bodyが"null"か"undefined"ならmessageに"undefined"を返し、req.bodyのmessageが"null"か"undefined"ならuserMessageに" "を返す
        const userMessage = (req.body?.message ?? "").slice(0, 2000); 
        if (!userMessage) {
            return res.status(400).json({ error: "message is required" });  //リクエストのbody:messageが空ならエラーメッセージをjsonで返す
        }

        // ▼ Chat Completions API の最小例（引数はシンプル化）
        // ドキュメント: platform.openai.com の API リファレンス参照（下記注） 
        const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {   //openAI(API)側との通信
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: "あなたは有能な日本語リサーチアシスタント。要点を箇条書きで、根拠と注意点も添えて簡潔に答える。" },
                    { role: "user", content: userMessage }
                ],
                temperature: 0.3
            })
        });

        if (!openaiRes.ok) {
            const txt = await openaiRes.text();
            return res.status(500).json({ error: `OpenAI API error: ${txt}` });
        }

        const data = await openaiRes.json();
        const reply = data.choices?.[0]?.message?.content ?? "(応答なし)";
        res.json({ reply });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: String(err) });
    }
});

// ==================== 自己PR自動生成API ====================
app.post("/api/selfpr", async (req, res) => {
    try {
        const { top1, top2, note } = req.body || {};

        if (!top1 || !top2) {
            return res.status(400).json({ error: "top1, top2 が不足しています。" });
        }

        const avg1 = Number(top1.avg ?? 0).toFixed(2);
        const avg2 = Number(top2.avg ?? 0).toFixed(2);

        const prompt = `
あなたは就活生をサポートするキャリアアドバイザーです。
以下の情報をもとに、日本語で400〜600文字程度の自己PR文を1つ作成してください。

【診断結果】
第1位の強み: ${top1.name_jp}（スコア: ${avg1}）
向いている職種の例: ${(top1.jobs || []).join("、")}

第2位の強み: ${top2.name_jp}（スコア: ${avg2}）
向いている職種の例: ${(top2.jobs || []).join("、")}

【本人からのメモ（任意）】
${note || "（特になし）"}

【出力条件】
- 就活のエントリーシートで使える自己PR文を作ってください。
- 冒頭で強みを一言でまとめ、その後に「エピソード → 工夫した点 → 結果 → 学び」の順に書いてください。
- 文体は「です・ます調」で、読み手に伝わりやすく。
`;

        const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: "あなたは就活生を支援するプロのキャリアアドバイザーです。"
                    },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7
            })
        });

        if (!openaiRes.ok) {
            const txt = await openaiRes.text();
            return res.status(500).json({ error: `OpenAI API error: ${txt}` });
        }

        const data = await openaiRes.json();
        const selfpr = data.choices?.[0]?.message?.content?.trim();

        res.json({ selfpr });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: String(err) });
    }
});


// ルートで index.html を返す（静的配信があるので省略可だが分かりやすく明示）
app.get("/", (_req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
    console.log(`http://localhost:${PORT}`);
});
