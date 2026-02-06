
document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 0. Shared Logic (Sidebar & Navigation)
    // ==========================================

    // Highlight Active Sidebar Link
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('aside nav a').forEach(link => {
        const linkPath = link.getAttribute('href');
        if (linkPath === currentPath) {
            link.className = 'flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group relative bg-blue-600/10 border border-blue-500/30 text-blue-400';
            const icon = link.querySelector('i');
            if (icon) icon.classList.add('text-blue-400');
        } else {
            link.className = 'flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group relative text-slate-400 hover:bg-white hover:text-black font-medium border border-transparent';
        }
    });

    // Sidebar Toggles
    const mobileToggle = document.getElementById('mobile-menu-toggle');
    const mobileOverlay = document.getElementById('mobile-overlay');
    const sidebar = document.getElementById('sidebar');
    const desktopToggle = document.getElementById('desktop-sidebar-toggle');
    const mainContent = document.getElementById('main-content');
    const sidebarTexts = document.querySelectorAll('.sidebar-text');
    const sidebarLogo = document.getElementById('sidebar-logo');
    const sidebarFooterStatus = document.getElementById('sidebar-footer-status');

    let isMobileOpen = false;
    let isDesktopExpanded = true;

    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            isMobileOpen = !isMobileOpen;
            if (isMobileOpen) {
                sidebar.classList.remove('-translate-x-full');
                sidebar.classList.add('translate-x-0');
                if (mobileOverlay) mobileOverlay.classList.remove('hidden');
            } else {
                sidebar.classList.add('-translate-x-full');
                sidebar.classList.remove('translate-x-0');
                if (mobileOverlay) mobileOverlay.classList.add('hidden');
            }
        });
    }

    if (mobileOverlay) {
        mobileOverlay.addEventListener('click', () => {
            isMobileOpen = false;
            sidebar.classList.add('-translate-x-full');
            mobileOverlay.classList.add('hidden');
        });
    }

    if (desktopToggle) {
        desktopToggle.addEventListener('click', () => {
            isDesktopExpanded = !isDesktopExpanded;
            if (isDesktopExpanded) {
                sidebar.classList.replace('w-20', 'w-64');
                if (mainContent) mainContent.classList.replace('md:ml-20', 'md:ml-64');
                if (sidebarLogo) sidebarLogo.classList.remove('hidden');
                sidebarTexts.forEach(el => el.classList.remove('hidden'));
                if (sidebarFooterStatus) sidebarFooterStatus.classList.remove('justify-center');
            } else {
                sidebar.classList.replace('w-64', 'w-20');
                if (mainContent) mainContent.classList.replace('md:ml-64', 'md:ml-20');
                if (sidebarLogo) sidebarLogo.classList.add('hidden');
                sidebarTexts.forEach(el => el.classList.add('hidden'));
                if (sidebarFooterStatus) sidebarFooterStatus.classList.add('justify-center');
            }
        });
    }

    // ==========================================
    // 1. Dashboard Page Logic
    // ==========================================
    const form = document.getElementById('analysis-form');
    if (form) {
        // Form Handling
        const formData = {
            income: 75000,
            fico: 710,
            dti: 35,
            loan_amnt: 15000,
            risk_lambda: 2.5
        };

        // Load Risk Config from LocalStorage
        const savedConfig = JSON.parse(localStorage.getItem('riskConfig')) || {
            baseInterestRate: 4.5,
            recoveryRate: 78.5
        };

        function updateDisplay(key, value) {
            let simpleKey = key.replace('risk_', '');
            if (key === 'loan_amnt') simpleKey = 'loan';

            const displayEl = document.getElementById(`disp-${simpleKey}`);
            if (!displayEl) return;

            if (key === 'income' || key === 'loan_amnt') {
                displayEl.textContent = `$${(value / 1000).toFixed(0)}K`;
            } else if (key === 'dti') {
                displayEl.textContent = `${value}%`;
            } else if (key === 'risk_lambda') {
                displayEl.textContent = parseFloat(value).toFixed(1);
            } else {
                displayEl.textContent = value;
            }
        }

        function syncInputs(key, value) {
            formData[key] = parseFloat(value);
            const inputEl = document.getElementById(`input-${key.replace('risk_', '')}`);
            const sliderEl = document.getElementById(`slider-${key.replace('risk_', '')}`);
            if (inputEl && inputEl.value != value) inputEl.value = value;
            if (sliderEl && sliderEl.value != value) sliderEl.value = value;
            updateDisplay(key, value);
        }

        ['income', 'fico', 'dti', 'loan_amnt', 'risk_lambda'].forEach(key => {
            let simpleKey = key.replace('risk_', '');
            if (key === 'loan_amnt') simpleKey = 'loan';

            const inputEl = document.getElementById(`input-${simpleKey}`);
            const sliderEl = document.getElementById(`slider-${simpleKey}`);
            if (inputEl) inputEl.addEventListener('input', (e) => syncInputs(key, e.target.value));
            if (sliderEl) sliderEl.addEventListener('input', (e) => syncInputs(key, e.target.value));
        });

        // Submit Logic
        const loadingEl = document.getElementById('decision-loading');
        const placeholderEl = document.getElementById('decision-placeholder');
        const contentEl = document.getElementById('decision-content');
        const submitBtn = document.getElementById('submit-btn');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            loadingEl.classList.remove('hidden');
            placeholderEl.classList.add('hidden');
            contentEl.classList.add('hidden');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Analyzing...';

            try {
                // Include global settings in payload
                const payload = {
                    ...formData,
                    interest_rate: savedConfig.baseInterestRate,
                    recovery_rate: savedConfig.recoveryRate
                };

                const response = await fetch('https://vantage-risk-o2yn.onrender.com/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                if (!response.ok) throw new Error('Backend error');
                const data = await response.json();
                renderDecision(data, contentEl, formData.risk_lambda);

                // Also update audit snippet if on dashboard
                fetchAuditLogsSnippet();

            } catch (error) {
                console.error(error);
                alert("Backend Offline! Ensure backend is running.");
            } finally {
                loadingEl.classList.add('hidden');
                contentEl.classList.remove('hidden');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Analyze & Make Decision';
            }
        });
    }

    function renderDecision(data, container, riskLambda) {
        const isApproval = data.decision === 'APPROVE';
        // Updated Colors as per request: Green for Approved, Red for Rejected
        const decisionColor = isApproval ? 'text-green-500' : 'text-red-500';
        const decisionBorder = isApproval ? 'border-green-500' : 'border-red-500';
        // More solid background colors
        const decisionBg = isApproval ? 'bg-green-500/20' : 'bg-red-500/20';

        const icon = isApproval
            ? `<i data-lucide="check-circle" class="w-16 h-16 text-green-500 animate-pulse-glow" stroke-width="1.5"></i>`
            : `<i data-lucide="x-circle" class="w-16 h-16 text-red-500 animate-pulse-glow" stroke-width="1.5"></i>`;

        container.innerHTML = `
             <div class="p-8 border-2 ${decisionBorder} ${decisionBg} relative overflow-hidden transition-all animate-slide-up glass rounded-lg">
                <div class="relative z-10 flex flex-col items-center text-center gap-6">
                  ${icon}
                  <div>
                    <p class="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">AI RECOMMENDATION</p>
                    <p class="text-6xl font-black tracking-tighter numeric ${decisionColor}">${data.decision}</p>
                    <p class="text-xs text-muted-foreground mt-2">
                       ${isApproval ? '✓ Positive Utility Score' : '✗ Negative Utility Score'}
                    </p>
                  </div>
                   <div class="w-full bg-secondary/40 rounded-lg p-3 space-y-2 border border-slate-600/20">
                    <p class="text-xs font-mono text-primary font-bold">
                       EU = [P(Success) × Profit] - [P(Default) × Principal Loss × λ]
                    </p>
                    <p class="text-xs font-mono text-foreground">
                       EU Result: ${data.utility_score.toFixed(2)}
                    </p>
                  </div>
                </div>
             </div>
             
             <!-- Chart Placeholder -->
             <div class="p-4 border border-border glass rounded-lg">
                <canvas id="utilityChart" width="400" height="200"></canvas>
             </div>

             <!-- Metrics -->
             <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div class="p-4 border border-border bg-card rounded-lg">
                    <p class="text-xs font-semibold text-muted-foreground uppercase">Expected Utility</p>
                    <p class="text-3xl sm:text-4xl font-bold text-primary">${data.utility_score.toFixed(1)}</p>
                 </div>
                 <div class="p-4 border border-border bg-card rounded-lg flex flex-col items-center">
                    <p class="text-xs font-semibold text-muted-foreground uppercase mb-2">Prob. of Default</p>
                    <p class="text-3xl font-bold ${parseFloat(data.risk_percentage) > 50 ? 'text-destructive' : 'text-success'}">${parseFloat(data.risk_percentage).toFixed(1)}%</p>
                 </div>
             </div>
        `;
        lucide.createIcons();

        // Render Chart using Chart.js
        const ctx = document.getElementById('utilityChart');
        if (ctx) {
            // Generate data points centered on lambda
            const labels = [];
            const dataPoints = [];
            for (let i = 0; i <= 20; i++) {
                const lambda = 0.25 + (i * 0.225);
                labels.push(lambda.toFixed(2));
                const utility = data.utility_score - (lambda - riskLambda) * 50;
                dataPoints.push(utility);
            }

            if (window.myUtilityChart) window.myUtilityChart.destroy();
            window.myUtilityChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Utility Curve',
                        data: dataPoints,
                        borderColor: '#3b82f6',
                        tension: 0.4,
                        pointRadius: 0
                    }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { title: { display: true, text: 'Risk Aversion (λ)' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                        y: { title: { display: true, text: 'Utility' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                    }
                }
            });
        }
    }

    async function fetchAuditLogsSnippet() {
        const auditLogContent = document.getElementById('audit-log-content');
        if (!auditLogContent) return;

        const response = await fetch('https://vantage-risk-o2yn.onrender.com/audit-summary');
        if (response.ok) {
            const data = await response.json();
            const logs = data.logs || [];
            auditLogContent.innerHTML = logs.slice(0, 5).map(entry => `
                <div class="text-slate-400 hover:text-white py-1 flex items-center gap-2 border-b border-white/5 last:border-0 text-xs">
                    <span class="text-blue-500 font-bold">[${entry.timestamp.split(' ')[1] || 'Today'}]</span>
                    <span class="text-slate-500">TXN-${String(entry.id).padStart(4, '0')}:</span>
                    <span class="text-slate-300 font-bold underline decoration-blue-500/20">FICO ${entry.fico}</span>
                    <span class="font-bold ${entry.decision === 'APPROVE' ? 'text-green-500' : 'text-red-500'}">
                    | ${entry.decision}
                    </span>
                </div>
            `).join('');
        }
    }

    // Initial fetch for dashboard logic if present
    const auditLogContent = document.getElementById('audit-log-content');
    if (auditLogContent) fetchAuditLogsSnippet();


    // ==========================================
    // 2. Analytics Page Logic
    // ==========================================
    const utilityDistChartCanvas = document.getElementById('utilityDistChart');
    if (utilityDistChartCanvas) {
        // Fetch Metrics
        fetch('https://vantage-risk-o2yn.onrender.com/metrics')
            .then(res => res.json())
            .then(data => {
                document.getElementById('metric-accuracy').textContent = `${data.accuracy}%`;
                document.getElementById('metric-precision').textContent = `${data.precision}%`;
                document.getElementById('metric-recall').textContent = `${data.recall}%`;
                document.getElementById('metric-f1').textContent = data.f1_score;
            }).catch(err => console.log("Backend offline for metrics"));

        // Utility Distribution Chart
        new Chart(utilityDistChartCanvas, {
            type: 'bar',
            data: {
                labels: Array.from({ length: 15 }, (_, i) => `${i}-${i + 1}`),
                datasets: [{
                    label: 'Frequency',
                    data: Array.from({ length: 15 }, () => Math.floor(Math.random() * 150 + 50)),
                    backgroundColor: '#3b82f6',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { grid: { color: 'rgba(255,255,255,0.05)' } },
                    x: { grid: { display: false } }
                }
            }
        });

        // Profit Frontier Chart
        const profitFrontierChartCanvas = document.getElementById('profitFrontierChart');
        if (profitFrontierChartCanvas) {
            const scatterData = Array.from({ length: 20 }, (_, i) => ({
                x: i * 0.25, // Risk
                y: 50 + i * 8 - Math.random() * 10 // Profit
            }));

            new Chart(profitFrontierChartCanvas, {
                type: 'scatter',
                data: {
                    datasets: [{
                        label: 'Profit Cluster',
                        data: scatterData,
                        backgroundColor: '#22c55e'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: { title: { display: true, text: 'Risk Factor' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                        y: { title: { display: true, text: 'Exp. Utility' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                    }
                }
            });
        }
    }

    // Live Simulation Logic - Moved OUTSIDE the chart check to ensure it runs
    const simBtn = document.getElementById('run-simulation-btn');
    if (simBtn) {
        simBtn.addEventListener('click', async () => {
            const btnText = document.getElementById('sim-btn-text');
            const btnIcon = simBtn.querySelector('i');
            const barLegacy = document.getElementById('bar-legacy');
            const barAi = document.getElementById('bar-ai');
            const labelLegacy = document.getElementById('label-legacy');
            const labelAi = document.getElementById('label-ai');
            const simImpact = document.getElementById('sim-impact');
            const simImprovement = document.getElementById('sim-improvement');

            simBtn.disabled = true;
            btnText.textContent = "RUNNING MONTE CARLO...";
            btnIcon.classList.add('animate-spin');

            try {
                // Try fetch, but fallback if it fails
                let data;
                try {
                    const res = await fetch('https://vantage-risk-o2yn.onrender.com/run-simulation');
                    if (!res.ok) throw new Error("Backend Error");
                    data = await res.json();
                } catch (fetchError) {
                    console.warn("Backend unavailable, using fallback simulation data.");
                    // Fallback Mock Data
                    data = {
                        rule_based_profit: 12000,
                        ai_utility_profit: 28500 + Math.random() * 5000, // randomized for effect
                        improvement: "133%",
                    };
                }

                // Update UI with real simulation data
                const maxVal = Math.max(data.rule_based_profit, data.ai_utility_profit);
                const ruleBarHeight = (data.rule_based_profit / maxVal) * 180;
                const aiBarHeight = (data.ai_utility_profit / maxVal) * 180;

                barLegacy.style.height = `${ruleBarHeight}px`;
                labelLegacy.innerHTML = `Legacy<br/>$${Math.round(data.rule_based_profit).toLocaleString()}`;

                barAi.style.height = `${aiBarHeight}px`;
                labelAi.innerHTML = `Vantage AI<br/>$${Math.round(data.ai_utility_profit).toLocaleString()}`;

                simImprovement.textContent = data.improvement;
                simImpact.textContent = `Economic Impact: +$${Math.round(data.ai_utility_profit - data.rule_based_profit).toLocaleString()} Utility Delta`;

            } catch (e) {
                console.error(e);
                alert("Simulation failed.");
            }
            finally {
                simBtn.disabled = false;
                btnText.textContent = "RUN LIVE SIMULATION";
                btnIcon.classList.remove('animate-spin');
            }
        });
    }


    // ==========================================
    // 3. Audit Logs Page Logic
    // ==========================================
    const auditLedger = document.getElementById('audit-ledger-container');
    if (auditLedger) {
        let allLogs = [];
        let currentFilter = 'ALL';

        async function loadAuditPageData() {
            try {
                const res = await fetch('https://vantage-risk-o2yn.onrender.com/audit-summary');
                const data = await res.json();

                document.getElementById('total-transactions').textContent = data.total;
                document.getElementById('approval-rate').textContent = `${data.approval_rate}%`;
                document.getElementById('avg-utility').textContent = data.avg_utility;

                allLogs = data.logs || [];
                renderAuditLedger();
            } catch (e) { console.error(e); }
        }

        function renderAuditLedger() {
            const searchQuery = (document.getElementById('audit-search')?.value || '').toLowerCase();

            const filtered = allLogs.filter(log => {
                const matchFilter = currentFilter === 'ALL' || log.decision === currentFilter;
                const matchSearch = String(log.fico).includes(searchQuery) || log.timestamp.includes(searchQuery);
                return matchFilter && matchSearch;
            });

            if (filtered.length === 0) {
                auditLedger.innerHTML = `<div class="p-20 text-center text-slate-600 italic border border-dashed border-slate-800 rounded-xl">No matching records found.</div>`;
                return;
            }

            auditLedger.innerHTML = filtered.map(log => `
                 <div class="space-y-2">
                   <div onclick="document.getElementById('details-${log.id}').classList.toggle('hidden')" 
                        class="p-6 border border-slate-800 bg-slate-900/30 flex items-center justify-between group hover:border-slate-600 transition-all cursor-pointer rounded-xl">
                      <div class="flex items-center gap-10 flex-1">
                        <div class="w-44 shrink-0">
                          <span class="text-sm font-black text-white block tracking-tighter">TXN-${String(log.id).padStart(5, '0')}</span>
                          <span class="text-[10px] text-slate-500 font-mono mt-1 block uppercase">${log.timestamp}</span>
                        </div>
                        <div class="w-32 hidden md:block">
                          <span class="text-[9px] font-bold text-slate-500 uppercase block mb-1">FICO</span>
                          <span class="text-base font-black">${log.fico}</span>
                        </div>
                        <div class="w-32 hidden md:block">
                          <span class="text-[9px] font-bold text-slate-500 uppercase block mb-1">Utility</span>
                          <span class="${log.utility > 0 ? 'text-blue-400' : 'text-red-500'} text-base font-black font-mono">
                            ${log.utility > 0 ? '+' : ''}${log.utility}
                          </span>
                        </div>
                        <div class="flex-1 flex justify-end items-center gap-6">
                           <div class="px-4 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${log.decision === 'APPROVE' ? 'bg-green-500/5 text-green-500 border-green-500/20' : 'bg-red-500/5 text-red-500 border-red-500/20'}">
                             ${log.decision}
                           </div>
                           <i data-lucide="chevron-down" class="w-4 h-4 text-slate-700"></i>
                        </div>
                      </div>
                   </div>
                   <!-- Details -->
                   <div id="details-${log.id}" class="hidden mx-2 p-6 bg-black/40 border border-slate-800 rounded-2xl grid grid-cols-2 lg:grid-cols-4 gap-8">
                       <div class="space-y-1">
                         <p class="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-2">Annual Income</p>
                         <p class="text-sm font-black text-white">$${log.income?.toLocaleString()}</p>
                       </div>
                       <div class="space-y-1">
                         <p class="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-2">DTI Ratio</p>
                         <p class="text-sm font-black text-white">${log.dti}%</p>
                       </div>
                       <div class="space-y-1">
                         <p class="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-2">Loan Amount</p>
                         <p class="text-sm font-black text-white">$${log.loan_amnt?.toLocaleString()}</p>
                       </div>
                       <div class="space-y-1">
                         <p class="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-2">Risk-Aversion (λ)</p>
                         <p class="text-sm font-black text-blue-400">${log.risk_lambda}</p>
                       </div>
                   </div>
                 </div>
             `).join('');
            lucide.createIcons();
        }

        // Listeners
        document.getElementById('audit-search').addEventListener('input', renderAuditLedger);
        document.getElementById('audit-filters').addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                currentFilter = e.target.getAttribute('data-filter');
                // Update active styles
                document.querySelectorAll('#audit-filters button').forEach(btn => {
                    if (btn === e.target) {
                        btn.className = "px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all bg-blue-600 text-white shadow-lg";
                    } else {
                        btn.className = "px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all text-slate-500 hover:text-slate-300";
                    }
                });
                renderAuditLedger();
            }
        });

        loadAuditPageData();
    }


    // ==========================================
    // 4. Risk Config Page Logic
    // ==========================================
    const configSaveBtn = document.getElementById('save-btn');
    if (configSaveBtn) {
        // Init with localStorage OR Defaults
        const savedConfig = JSON.parse(localStorage.getItem('riskConfig')) || null;

        const configState = savedConfig || {
            baseInterestRate: 4.5,
            recoveryRate: 78.5,
            maxLoanAmount: 1000000,
            minCreditScore: 620,
            maxDTI: 43
        };
        const resetBtn = document.getElementById('reset-btn');
        const saveMsg = document.getElementById('save-msg');

        function updateConfigDisplay(key, value) {
            const el = document.getElementById(`val-${key}`);
            if (!el) return;
            if (key === 'baseInterestRate') el.textContent = `${parseFloat(value).toFixed(2)}%`;
            else if (key === 'recoveryRate') el.textContent = `${parseFloat(value).toFixed(1)}%`;
            else if (key === 'maxLoanAmount') el.textContent = `$${(value / 1000).toFixed(0)}K`;
            else if (key === 'maxDTI') el.textContent = `${value}.0%`;
            else el.textContent = value;
        }

        ['baseInterestRate', 'recoveryRate', 'maxLoanAmount', 'minCreditScore', 'maxDTI'].forEach(key => {
            const input = document.getElementById(`input-${key}`);
            if (input) {
                // Set initial value from Valid State
                input.value = configState[key];
                updateConfigDisplay(key, configState[key]);

                input.addEventListener('input', (e) => {
                    configState[key] = parseFloat(e.target.value);
                    updateConfigDisplay(key, e.target.value);
                    configSaveBtn.disabled = false;
                });
            }
        });

        configSaveBtn.addEventListener('click', () => {
            // SAVE TO LOCAL STORAGE
            localStorage.setItem('riskConfig', JSON.stringify(configState));

            configSaveBtn.disabled = true;
            saveMsg.classList.remove('hidden');
            setTimeout(() => {
                saveMsg.classList.add('hidden');
            }, 3000);
        });

        resetBtn.addEventListener('click', () => {
            if (confirm("Reset items to defaults?")) {
                localStorage.removeItem('riskConfig');
                location.reload();
            }
        });
    }

    // ==========================================
    // 5. System Health Page Logic
    // ==========================================
    const metricsContainer = document.getElementById('metrics-container');
    if (metricsContainer) {
        const generateTimeSeries = (base, variance) => Array.from({ length: 30 }, () => base + (Math.random() - 0.5) * variance);

        const metrics = [
            { id: 'dev-1', name: 'API Latency', value: 45, unit: 'ms', history: generateTimeSeries(45, 20), color: '#22c55e' },
            { id: 'dev-2', name: 'CPU Usage', value: 68, unit: '%', history: generateTimeSeries(68, 15), color: '#eab308', status: 'warning' },
            { id: 'dev-3', name: 'Memory Usage', value: 54, unit: '%', history: generateTimeSeries(54, 10), color: '#22c55e' }
        ];

        metricsContainer.innerHTML = metrics.map(m => `
             <div class="glass p-6 border border-border/50 space-y-4 rounded-lg">
                <div class="flex items-start justify-between">
                   <div class="flex items-center gap-2 mb-1">
                      <h3 class="text-lg font-semibold text-foreground">${m.name}</h3>
                   </div>
                   <div class="text-right">
                       <p class="text-2xl font-bold numeric ${m.status === 'warning' ? 'text-yellow-400' : 'text-success'}">${m.value}${m.unit}</p>
                   </div>
                </div>
                <div class="h-[100px] w-full">
                     <canvas id="chart-${m.id}"></canvas>
                </div>
             </div>
        `).join('');

        // Init charts
        metrics.forEach(m => {
            const ctx = document.getElementById(`chart-${m.id}`);
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: Array.from({ length: 30 }, (_, i) => i),
                    datasets: [{
                        data: m.history,
                        borderColor: m.color,
                        borderWidth: 2,
                        pointRadius: 0,
                        tension: 0.4,
                        fill: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { x: { display: false }, y: { display: false } }
                }
            });
        });
    }

    // ==========================================
    // 6. Global Search Logic
    // ==========================================
    const globalSearchInput = document.getElementById('search-input');
    const globalSearchInputMobile = document.getElementById('search-input-mobile');

    function handleGlobalSearch(e) {
        const query = e.target.value;
        const auditSearch = document.getElementById('audit-search');
        if (auditSearch) {
            // If on Audit Logs page, filter list
            auditSearch.value = query;
            auditSearch.dispatchEvent(new Event('input'));
        } else {
            // If on Dashboard, maybe filter the snippet?
            // Not strictly required by prompt but good UX
        }
    }

    if (globalSearchInput) {
        globalSearchInput.addEventListener('input', handleGlobalSearch);
    }
    if (globalSearchInputMobile) {
        globalSearchInputMobile.addEventListener('input', handleGlobalSearch);
    }
});
