// public/app.js

// ==================== 調べ物チャット ====================
const chatArea = document.getElementById("chat-area");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");

// roleがuserかbotか判断し、それぞれの役に応じてメッセージを出力し、chat-areaに追加する関数
function addMsg(role, text) {
    const div = document.createElement("div");
    div.className = `msg ${role === "user" ? "me" : "bot"}`;
    div.textContent = text;
    chatArea.appendChild(div);  //chat-areaに作成した変数divを追加する関数
    chatArea.scrollTop = chatArea.scrollHeight;
}

chatForm.addEventListener("submit", async (e) => {  //formが送信されたときの動作
    e.preventDefault();                             //画面遷移の制御
    const text = chatInput.value.trim();           //送信されたtextの値を加工
    if (!text) return;                              //textの値が空なら何も動作しないようにする
    addMsg("user", text);
    chatInput.value = "";                        //formに書いた内容を空にする
    try {
        const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: text })    //textの内容をjson形式に加工してserver側に送信
        });
        const json = await res.json();         //serverからのresをjson形式に加工してjsonに代入

        //resの内容がerrorならerrorメッセージを表示する
        if (json.error) addMsg("bot", "サーバーエラー: " + json.error);

        //resの内容がopenAIからのものならば,chatAreaにresの内容をjson形式で表示する
        else addMsg("bot", json.reply ?? "(応答取得に失敗)");
    } catch (err) {
        addMsg("bot", "通信エラー: " + String(err));
    }
});

// ==================== 職業診断（四択） ====================
// 軸: A=分析/論理, B=創造/表現, C=対人/協働, D=実務/手を動かす


// 軸→おすすめ職業（例）
const CAREERS = {
    A: {
        title: "分析・設計タイプ",
        jobs: ["データアナリスト", "バックエンドエンジニア", "業務コンサル", "QA/テストエンジニア"],
        pitch: "論理性と再現性を武器に、課題を構造化して解決する役割に強みがあります。",
    },
    B: {
        title: "クリエイティブタイプ",
        jobs: ["UI/UXデザイナー", "コンテンツクリエイター", "フロントエンドエンジニア", "プロダクトデザイナー"],
        pitch: "発想力と試作の速さが武器。ユーザー体験や表現が価値になる領域で活躍できます。",
    },
    C: {
        title: "コミュニケーションタイプ",
        jobs: ["カスタマーサクセス", "営業/アカウントプランナー", "採用/人事", "プロジェクトマネージャー"],
        pitch: "関係構築と合意形成が得意。人と成果をつなぐハブの役割で力を発揮します。",
    },
    D: {
        title: "実務・現場タイプ",
        jobs: ["製造/生産技術", "フィールドエンジニア", "施工管理", "サプライチェーン/ロジスティクス"],
        pitch: "手触りのある成果や改善が得意。現場での検証や運用に強みがあります。",
    },
};

const startBtn = document.getElementById("start-btn");   //診断スタートボタン
const quizArea = document.getElementById("quiz-area");   //質問エリア
const resultArea = document.getElementById("result-area"); //診断結果表示
const questionEl = document.getElementById("question");  //質問内容
const choicesEl = document.getElementById("choices");   //四択の選択肢
const prevBtn = document.getElementById("prev-btn");   //戻るボタン
const nextBtn = document.getElementById("next-btn");   //次へボタン
const progressEl = document.getElementById("progress");  //ページ数表示
const reviewArea = document.getElementById("review-area");
const reviewEl = document.getElementById("review-body");  //アプリ評価質問エリア
const answerBtn = document.getElementById("submit");  //アプリ評価ボタン
const remainBtn = document.getElementById("back");   //結果を再確認ボタン
const appreciateArea = document.getElementById("answer-area");  //お礼エリア

let idx = 0;    //質問番号
let QUESTIONS = [];
let picks = []; // 各問の選択index
let score = { A: 0, B: 0, C: 0, D: 0 };
const ANSWER = [
    "まったく当てはまらない",
    "あまり当てはまらない",
    "どちらともいえない",
    "わりとあてはまる",
    "非常によく当てはまる",
]


//外部jsonを読み込む関数
async function loadData() {
    const res = await fetch("../data/data.json");
    return await res.json();
}

async function loadQuestions() {
    const data = await loadData();  //外部jsonを読み込む

    const questions = Object.values(data).flatMap(item => ([
        {
            key: item.name_en,
            name_jp: item.name_jp,
            text: item.question_normal,  // ← 実際に表示する文
            kind: "normal",
            category: item.category,
            jobs: item.jobs
        },
        {
            key: item.name_en,
            name_jp: item.name_jp,
            text: item.question_reverse, // ← 逆転項目
            kind: "reverse",
            category: item.category,
            jobs: item.jobs
        }
    ]));

    QUESTIONS = questions;
}

function render() {
    const item = QUESTIONS[idx];    //配列QUESTIONSのidx番号の内容を変数itemに格納   質問が上から順番に表示されるようになっている
    questionEl.textContent = item.text;  //idx（配列番号）の質問qを書き換え

    choicesEl.innerHTML = "";   //選択肢ボタンのリセット

    ANSWER.forEach((c, i) => {      //iはbuttonの番号 cはbuttonの要素
        const btn = document.createElement("button");
        btn.className = "choice";
        btn.textContent = c;
        if (picks[idx] === i) btn.classList.add("active");

        btn.addEventListener("click", () => {
            picks[idx] = i;
            document.querySelectorAll(".choice").forEach(e1 => e1.classList.remove("active"));
            btn.classList.add("active");
            nextBtn.disabled = false;
        })
        choicesEl.appendChild(btn);
    });
    prevBtn.disabled = idx === 0;    //一問目の時は、戻るボタンが解放されない（disabled = true)
    nextBtn.textContent = (idx === QUESTIONS.length - 1) ? "結果を見る" : "次へ";   //idxがQUESTIONの数と同じになったら結果を見るに書き換える
    nextBtn.disabled = picks[idx] == null;      //userが回答を選択していなければ、picks[idx]の中身は空になるので,disabledがtrueになり、次へのボタンが選択されない
    progressEl.textContent = `${idx + 1} / ${QUESTIONS.length}`;     //ページ数の表示
}

function calcAndShowResult() {
    // スコア初期化
    const abilityScores = {};

    QUESTIONS.forEach((q, idx) => {
        const pickIndex = picks[idx];
        if (pickIndex == null) return; // 未回答はスキップ

        // 1〜5 に変換
        const raw = pickIndex + 1;

        // 逆転処理
        const score = (q.kind === "reverse")
            ? 6 - raw   // reverse
            : raw;      // normal

        // この能力キーごとの器を用意  新しい能力はベースを作成　既存の能力はsumとcountを+１するだけ
        if (!abilityScores[q.key]) {
            abilityScores[q.key] = {
                key: q.key,
                name_jp: q.name_jp,
                category: q.category,
                jobs: q.jobs,
                sum: 0,
                count: 0
            };
        }

        abilityScores[q.key].sum += score;
        abilityScores[q.key].count += 1;  //最後に合計を割るための数
    });

    // 平均スコアを計算して配列に変換
    const result = Object.values(abilityScores).map(a => ({
        key: a.key,
        name_jp: a.name_jp,
        category: a.category,
        jobs: a.jobs,
        avg: a.sum / a.count,   // ここが 4.3 / 5.0 みたいな値
        sum: a.sum,
        count: a.count
    }));

    // 平均スコアで降順ソート（強み順）
    result.sort((a, b) => b.avg - a.avg);
    const top1 = result[0];
    const top2 = result[1];

    //何回診断しても書き換えれるから診断可能
    resultArea.innerHTML = `
    <h3>診断結果</h3>

    <p><strong>あなたの最も強い能力（第1位）</strong></p>
    <h4>${top1.name_jp}</h4>
    <p>スコア：${top1.avg.toFixed(2)} / 5.00</p>
    <p>おすすめ職業：${top1.jobs.join("、")}</p>
    <hr/>

    <p><strong>第2位の強み</strong></p>
    <h4>${top2.name_jp}</h4>
    <p>スコア：${top2.avg.toFixed(2)} / 5.00</p>
    <p>おすすめ職業：${top2.jobs.join("、")}</p>

    <div style="margin-top: 16px;" class="row between">
        <button id="restart" class="ghost">もう一度診断</button>
        <button id="review">終了する</button>
    </div>
`;
    document.getElementById("restart").addEventListener("click", () => {
        idx = 0;
        picks = [];
        //結果と診断の切り替え
        resultArea.classList.add("hidden");
        quizArea.classList.remove("hidden");
        reviewArea.classList.add("hidden");
        render();
    });

    document.getElementById("review").addEventListener("click", () => {
        const item = REVIEW[0];

        reviewEl.innerHTML = "";

        reviewArea.classList.remove("hidden");
        resultArea.classList.add("hidden");
        quizArea.classList.add("hidden");

        const div = document.createElement("div");
        div.className = "question";
        div.textContent = item.q;
        reviewEl.appendChild(div);

        item.choices.forEach((text) => {
            const btn = document.createElement("button");
            btn.className = "choice";
            btn.textContent = text.label;

            btn.addEventListener("click", () => {
                document.querySelectorAll(".choice").forEach(e => e.classList.remove("active"));  //どのbuttonからもactiveを消す
                btn.classList.add("active");
            });
            reviewEl.appendChild(btn);
        });
    });

    quizArea.classList.add("hidden");    //結果表示で質問と選択欄が消える
    resultArea.classList.remove("hidden");   //結果表示エリアが解放される　　hiddenで表示の有無を操作している
}

//診断ボタンをクリック
startBtn.addEventListener("click", async () => {
    startBtn.disabled = true;            //診断スタートbuttonを押せないようにする
    quizArea.classList.remove("hidden");   //cssで非表示にしているclassNameからhiddenを取り除き、クイズアリアを表示している
    resultArea.classList.add("hidden");       //終了後にもう一度診断するボタンを押したとき、診断結果を非表示にするため
    reviewArea.classList.add("hidden");
    appreciateArea.classList.add("hidden");
    idx = 0; picks = []; score = { A: 0, B: 0, C: 0, D: 0 }; //保存された回答はリセット
    await loadQuestions();
    render();
});


//戻るボタンへのクリック
prevBtn.addEventListener("click", () => {
    if (idx === 0) return;  //戻るボタンを押したときが最初の質門であれば、この処理は中断される

    //質問番号を一問戻し、質問しなおす
    idx--;
    render();
});

//次へボタンのクリック
nextBtn.addEventListener("click", () => {
    if (idx < QUESTIONS.length - 1) {    //lengthは0を含めないので配列との比較の際に-1をしている　　idxが質問数の上限を上回っていたら結果を表示する処理
        idx++;
        render();     //質問番号を一問進み、次の質問へ
    } else {
        calcAndShowResult();
        startBtn.disabled = false;
    }
});

//回答終了ボタン
answerBtn.addEventListener("click", () => {
    reviewArea.classList.add("hidden");
    appreciateArea.classList.remove("hidden");
    appreciateArea.innerHTML = `
    <h2>ご回答に協力いただきありがとうございました！</h2>
    `;
});

//結果を再確認ボタン
remainBtn.addEventListener("click", () => {
    reviewArea.classList.add("hidden");
    resultArea.classList.remove("hidden");
})