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
const partialBtn = document.getElementById("debug-result-btn"); //途中結果確認ボタン

// GoogleフォームのURL（自分のフォームURLに差し替える）
const SURVEY_URL = "https://docs.google.com/forms/d/e/1FAIpQLSc0dIa7AWO0a0Myu4HRuhKtlF6sbAxyr5pK8CoPrBHNwS3X6A/viewform?usp=header";



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
    const res = await fetch("/data/data.json");
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

function updatePartialResultButton() {
    if (!partialBtn) return;  // ボタンがない画面なら何もしない

    const answeredCount = picks.filter(v => v != null).length;
    const isAfterFourthQuestion = idx >= 3; // 0,1,2,3... → 3 が4問目

    // 条件を両方満たしたときだけ有効にする
    partialBtn.disabled = !(answeredCount >= 4 && isAfterFourthQuestion);
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

            updatePartialResultButton();
        })
        choicesEl.appendChild(btn);
    });
    prevBtn.disabled = idx === 0;    //一問目の時は、戻るボタンが解放されない（disabled = true)
    nextBtn.textContent = (idx === QUESTIONS.length - 1) ? "結果を見る" : "次へ";   //idxがQUESTIONの数と同じになったら結果を見るに書き換える
    nextBtn.disabled = picks[idx] == null;      //userが回答を選択していなければ、picks[idx]の中身は空になるので,disabledがtrueになり、次へのボタンが選択されない
    progressEl.textContent = `${idx + 1} / ${QUESTIONS.length}`;     //ページ数の表示

    updatePartialResultButton();
}

function calcAndShowResult(options = {}) {
    const { partial = false } = options;  //引数にoption.partialが無ければpartialはfalseを返す
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

//何回診断しても書き換えれるから診断可能    partialがtrueを返せば、暫定文が入る
    resultArea.innerHTML = `
    <h3>診断結果</h3>
    ${partial ? '<p style="color:#666; font-size: 0.9rem;">※まだ全ての質問に回答していないため、暫定的な結果です。</p>' : ''}   

    <p><strong>あなたの最も強い能力（第1位）</strong></p>
    <h4>${top1.name_jp}</h4>
    <p>スコア：${top1.avg.toFixed(2)} / 5.00</p>
    <p>おすすめ職業：${top1.jobs.join("、")}</p>
    <hr/>

    <p><strong>第2位の強み</strong></p>
    <h4>${top2.name_jp}</h4>
    <p>スコア：${top2.avg.toFixed(2)} / 5.00</p>
    <p>おすすめ職業：${top2.jobs.join("、")}</p>

    <hr/>
    <section id="selfpr-area" style="margin-top:16px;">
        <h3>自己PR自動生成</h3>
        <p>自己PRに入れたいエピソードや工夫したことがあれば、簡単に書いてください（任意）</p>
        <textarea id="selfpr-note" rows="4" style="width:100%;"></textarea>
        <button id="selfpr-btn" style="margin-top:8px;">自己PRを生成する</button>
        <div id="selfpr-output" style="margin-top:12px; white-space:pre-wrap;"></div>
    </section>

    <div style="margin-top: 16px;" class="row between">
        <button id="restart" class="ghost">もう一度診断</button>
        <button id="review">終了する</button>
    </div>
`;
    const selfprBtn = document.getElementById("selfpr-btn");
    const selfprNote = document.getElementById("selfpr-note");
    const selfprOutput = document.getElementById("selfpr-output");

    selfprBtn.addEventListener("click", async () => {
        selfprBtn.disabled = true;
        selfprOutput.textContent = "自己PRを生成中です…";

        try {
            const res = await fetch("/api/selfpr", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    // 第1位・第2位の能力情報と、ユーザーのメモを渡す
                    top1: {
                        key: top1.key,
                        name_jp: top1.name_jp,
                        avg: top1.avg,
                        jobs: top1.jobs
                    },
                    top2: {
                        key: top2.key,
                        name_jp: top2.name_jp,
                        avg: top2.avg,
                        jobs: top2.jobs
                    },
                    note: selfprNote.value
                })
            });

            const json = await res.json();
            if (json.error) {
                selfprOutput.textContent = "サーバーエラー: " + json.error;
            } else {
                selfprOutput.textContent = json.selfpr ?? "自己PRの生成に失敗しました。";
            }
        } catch (err) {
            selfprOutput.textContent = "通信エラー: " + String(err);
        } finally {
            selfprBtn.disabled = false;
        }
    });
    
    document.getElementById("restart").addEventListener("click", () => {
        idx = 0;
        picks = [];
        //結果と診断の切り替え
        resultArea.classList.add("hidden");
        quizArea.classList.remove("hidden");
        reviewArea.classList.add("hidden");
        startBtn.disabled = true;
        render();
    });

    document.getElementById("review").addEventListener("click", () => {
        reviewEl.innerHTML = `
            <h3>アンケートのお願い</h3>
            <p>
                このアプリの使い心地について、簡単なアンケートにご協力いただけると嬉しいです。<br>
                アンケートは <strong>任意</strong> で、所要時間は 1〜2 分程度です。
            </p>
            <button id="open-form-btn" class="primary">
                アンケートフォームを開く（別タブで表示）
            </button>
            <p style="margin-top:8px; font-size:0.9rem;">
                ※「結果を確認する」を押すとアンケートに進まず診断結果に戻れます。<br>
                ※「回答を終了する」を押すと、このアプリの画面は終了し、お礼メッセージが表示されます。
            </p>
        `;

        // 画面の切り替え
        reviewArea.classList.remove("hidden");
        resultArea.classList.add("hidden");
        quizArea.classList.add("hidden");

        // Googleフォームを新しいタブで開くボタン
        const openFormBtn = document.getElementById("open-form-btn");
        openFormBtn.addEventListener("click", () => {
            window.open(SURVEY_URL, "_blank", "noopener,noreferrer");
        });    
    });

    quizArea.classList.add("hidden");    //結果表示で質問と選択欄が消える
    resultArea.classList.remove("hidden");   //結果表示エリアが解放される　　hiddenで表示の有無を操作している
}

//診断ボタンをクリック
startBtn.addEventListener("click", async() => {
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
        <h2>ご利用ありがとうございました！</h2>
        <p>
            アプリを最後までご利用いただき、ありがとうございました。<br>
            アンケートへのご協力（またはご検討）にも心より感謝いたします。<br>
            このアプリが、今後のキャリアを考えるきっかけになれば幸いです。
        </p>
    `;
});

//結果を再確認ボタン
remainBtn.addEventListener("click", () => {
    reviewArea.classList.add("hidden");
    resultArea.classList.remove("hidden");
})

if (partialBtn) {
    partialBtn.addEventListener("click", () => {
        if (partialBtn.disabled) return;

        calcAndShowResult({partial: true });

        startBtn.disabled = false;
    });
}
