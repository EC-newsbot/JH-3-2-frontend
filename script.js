// ===== 설정 =====
const API_BASE_URL = "https://jh-cs-3-2.onrender.com";

// ===== 탭 전환 =====
const tabButtons = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetTab = btn.dataset.tab; // data-tab 속성값 (예: "chat", "data")

    // 모든 버튼/화면에서 active 클래스 제거
    tabButtons.forEach((b) => b.classList.remove("active"));
    tabContents.forEach((c) => c.classList.remove("active"));

    // 클릭된 버튼과 해당 화면에만 active 클래스 추가
    btn.classList.add("active");
    document.getElementById(`tab-${targetTab}`).classList.add("active");
  });
});


// ===== 채팅 기능 =====
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatMessages = document.getElementById("chat-messages");
const chatLoading = document.getElementById("chat-loading");

function addMessage(role, content) {
  const div = document.createElement("div");
  div.className = `message ${role}`; // "message user" 또는 "message assistant"
  div.textContent = content;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight; // 자동으로 맨 아래로 스크롤
}

// 대화 히스토리를 기억하는 배열 (파일 상단, chatForm 선언 근처에 추가)
let chatHistory = [];

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const userMessage = chatInput.value.trim();
  if (!userMessage) return;

  addMessage("user", userMessage);
  chatInput.value = "";
  chatLoading.classList.remove("hidden");

  try {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: userMessage,
        history: chatHistory,   // ← 이전 대화 내역 같이 전송
      }),
    });

    if (!response.ok) throw new Error(`서버 오류: ${response.status}`);

    const data = await response.json();
    addMessage("assistant", data.answer);

    // 히스토리에 이번 질문+답변 추가
    chatHistory.push({ role: "user", content: userMessage });
    chatHistory.push({ role: "assistant", content: data.answer });

  } catch (error) {
    addMessage("assistant", `오류가 발생했습니다: ${error.message}`);
  } finally {
    chatLoading.classList.add("hidden");
  }
});


// ===== 데이터 관리 기능 =====
const dataForm = document.getElementById("data-form");
const dataTableBody = document.getElementById("data-table-body");
const dataFilterCoin = document.getElementById("data-filter-coin");
const dataFilterBtn = document.getElementById("data-filter-btn");

// 데이터 목록을 불러와서 테이블에 그리는 함수
async function loadDataList(coin = "") {
  try {
    const url = coin
      ? `${API_BASE_URL}/api/data?coin=${encodeURIComponent(coin)}`
      : `${API_BASE_URL}/api/data`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`서버 오류: ${response.status}`);

    const dataList = await response.json();
    renderDataTable(dataList);

  } catch (error) {
    dataTableBody.innerHTML = `<tr><td colspan="5">불러오기 실패: ${error.message}</td></tr>`;
  }
}

// 데이터 배열을 받아서 테이블 행(tr)들을 그리는 함수
function renderDataTable(dataList) {
  dataTableBody.innerHTML = ""; // 기존 내용 비우기

  if (dataList.length === 0) {
    dataTableBody.innerHTML = `<tr><td colspan="5">데이터가 없습니다.</td></tr>`;
    return;
  }

  dataList.forEach((item) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.coin}</td>
      <td>${item.date}</td>
      <td>${item.value}</td>
      <td>${item.memo || ""}</td>
      <td><button class="delete-btn" data-id="${item.id}">삭제</button></td>
    `;
    dataTableBody.appendChild(tr);
  });

  // 방금 만든 삭제 버튼들에 각각 클릭 이벤트 연결
  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      await deleteDataItem(id);
    });
  });
}

// 새 데이터 추가
dataForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    coin: document.getElementById("data-coin").value.trim().toUpperCase(),
    date: document.getElementById("data-date").value,
    value: parseFloat(document.getElementById("data-value").value),
    memo: document.getElementById("data-memo").value.trim(),
  };

  try {
    const response = await fetch(`${API_BASE_URL}/api/data`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error(`서버 오류: ${response.status}`);

    dataForm.reset(); // 입력창 비우기
    loadDataList(); // 목록 새로고침

  } catch (error) {
    alert(`데이터 추가 실패: ${error.message}`);
  }
});

// 데이터 삭제
async function deleteDataItem(id) {
  if (!confirm("정말 삭제하시겠습니까?")) return;

  try {
    const response = await fetch(`${API_BASE_URL}/api/data/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) throw new Error(`서버 오류: ${response.status}`);

    loadDataList(); // 목록 새로고침

  } catch (error) {
    alert(`삭제 실패: ${error.message}`);
  }
}

// 코인 필터로 조회
dataFilterBtn.addEventListener("click", () => {
  const coin = dataFilterCoin.value.trim().toUpperCase();
  loadDataList(coin);
});

// 페이지 처음 로드될 때 전체 데이터 목록 한 번 불러오기
loadDataList();


// ===== 대화 기록 기능 =====
const historyList = document.getElementById("history-list");
const historyDetail = document.getElementById("history-detail");

// 대화 목록 불러오기 (미리보기 형태)
async function loadHistoryList() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/conversations`);
    if (!response.ok) throw new Error(`서버 오류: ${response.status}`);

    const conversations = await response.json();
    renderHistoryList(conversations);

  } catch (error) {
    historyList.innerHTML = `<li>불러오기 실패: ${error.message}</li>`;
  }
}

function renderHistoryList(conversations) {
  historyList.innerHTML = "";

  if (conversations.length === 0) {
    historyList.innerHTML = `<li>저장된 대화가 없습니다.</li>`;
    return;
  }

  conversations.forEach((conv) => {
    const li = document.createElement("li");

    const dateStr = new Date(conv.created_at).toLocaleString("ko-KR");

    li.innerHTML = `
      <span>${conv.preview || "(내용 없음)"} <small>(${dateStr})</small></span>
      <button class="history-delete-btn" data-id="${conv.id}">삭제</button>
    `;

    // 항목 자체(텍스트 부분)를 클릭하면 상세 조회
    li.querySelector("span").addEventListener("click", () => {
      loadHistoryDetail(conv.id);
    });

    // 삭제 버튼은 별도로 클릭 이벤트 연결
    li.querySelector(".history-delete-btn").addEventListener("click", async (e) => {
      e.stopPropagation(); // 부모(li)의 클릭 이벤트로 안 번지게 막기
      await deleteHistoryItem(conv.id);
    });

    historyList.appendChild(li);
  });
}

// 특정 대화 상세 조회 (전체 메시지)
async function loadHistoryDetail(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/conversations/${id}`);
    if (!response.ok) throw new Error(`서버 오류: ${response.status}`);

    const conv = await response.json();

    historyDetail.innerHTML = conv.messages
      .map((m) => `<div class="message ${m.role}">${m.content}</div>`)
      .join("");

  } catch (error) {
    historyDetail.innerHTML = `<p>불러오기 실패: ${error.message}</p>`;
  }
}

// 대화 삭제
async function deleteHistoryItem(id) {
  if (!confirm("이 대화를 삭제하시겠습니까?")) return;

  try {
    const response = await fetch(`${API_BASE_URL}/api/conversations/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) throw new Error(`서버 오류: ${response.status}`);

    loadHistoryList(); // 목록 새로고침
    historyDetail.innerHTML = ""; // 상세 화면도 비우기

  } catch (error) {
    alert(`삭제 실패: ${error.message}`);
  }
}

// 페이지 처음 로드될 때 대화 목록 한 번 불러오기
loadHistoryList();


// ===== 요약 정보 기능 =====
const summaryCoinSelect = document.getElementById("summary-coin");
const summaryStartDate = document.getElementById("summary-start-date");
const summaryEndDate = document.getElementById("summary-end-date");
const summaryFetchBtn = document.getElementById("summary-fetch-btn");
const summaryResult = document.getElementById("summary-result");
const summaryChartCanvas = document.getElementById("summary-chart");

let summaryChartInstance = null; // 그래프를 다시 그릴 때 기존 그래프를 지우기 위해 저장해둠

async function loadSummary(coin, startDate, endDate) {
  summaryResult.innerHTML = "불러오는 중...";

  try {
    // 1) 요약 통계 조회 (기간 파라미터 포함)
    let summaryUrl = `${API_BASE_URL}/api/data/summary?coin=${encodeURIComponent(coin)}`;
    if (startDate) summaryUrl += `&start_date=${startDate}`;
    if (endDate) summaryUrl += `&end_date=${endDate}`;

    const summaryResponse = await fetch(summaryUrl);
    if (!summaryResponse.ok) throw new Error(`서버 오류: ${summaryResponse.status}`);
    const summary = await summaryResponse.json();
    renderSummary(summary);

    // 2) 그래프용 전체 데이터 조회 (같은 코인 기준)
    const dataResponse = await fetch(`${API_BASE_URL}/api/data?coin=${encodeURIComponent(coin)}`);
    if (!dataResponse.ok) throw new Error(`서버 오류: ${dataResponse.status}`);
    let records = await dataResponse.json();

    // 3) 프론트에서 날짜 범위로 필터링 (백엔드 summary와 동일한 기준 적용)
    if (startDate) records = records.filter((r) => r.date >= startDate);
    if (endDate) records = records.filter((r) => r.date <= endDate);

    // 4) 날짜 순 정렬 후 그래프 그리기
    records.sort((a, b) => (a.date > b.date ? 1 : -1));
    renderChart(records);

  } catch (error) {
    summaryResult.innerHTML = `<p>불러오기 실패: ${error.message}</p>`;
  }
}

function renderSummary(summary) {
  if (!summary.count) {
    summaryResult.innerHTML = `<p>${summary.trend || "데이터가 없습니다."}</p>`;
    return;
  }

  const metrics = summary.metrics || {};

  summaryResult.innerHTML = `
    <p><strong>기간:</strong> ${summary.period}</p>
    <p><strong>데이터 일수:</strong> ${summary.count}개</p>
    <p><strong>평균:</strong> ${metrics.average?.toLocaleString()}</p>
    <p><strong>최고:</strong> ${metrics.max?.toLocaleString()}</p>
    <p><strong>최저:</strong> ${metrics.min?.toLocaleString()}</p>
    <p><strong>트렌드:</strong> ${summary.trend}</p>
  `;
}

function renderChart(records) {
  const labels = records.map((r) => r.date);
  const values = records.map((r) => r.value);

  // 기존에 그래프가 그려져 있었다면 지우고 새로 그리기 (안 지우면 겹쳐서 이상하게 보임)
  if (summaryChartInstance) {
    summaryChartInstance.destroy();
  }

  summaryChartInstance = new Chart(summaryChartCanvas, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "가격",
          data: values,
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          fill: true,
          tension: 0.2,
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: {
          ticks: { color: "#94a3b8", maxTicksLimit: 10 },
          grid: { color: "#334155" },
        },
        y: {
          ticks: { color: "#94a3b8" },
          grid: { color: "#334155" },
        },
      },
    },
  });
}

summaryFetchBtn.addEventListener("click", () => {
  const coin = summaryCoinSelect.value;
  const startDate = summaryStartDate.value; // 비어있으면 빈 문자열
  const endDate = summaryEndDate.value;
  loadSummary(coin, startDate, endDate);
});

// 페이지 처음 로드될 때 기본 코인(BTC) 요약 + 그래프를 한 번 불러오기
loadSummary(summaryCoinSelect.value, "", "");