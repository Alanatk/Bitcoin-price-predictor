const API_BASE_URL = 'http://localhost:8000/api';

const currentPriceEl = document.getElementById('current-price');
const predictedPriceEl = document.getElementById('predicted-price');
const currentDateEl = document.getElementById('current-date');
const trendIconEl = document.getElementById('trend-icon');
const trendValueEl = document.getElementById('trend-value');

const trainBtn = document.getElementById('train-btn');
const btnText = trainBtn.querySelector('.btn-text');
const btnLoader = trainBtn.querySelector('.btn-loader');
const statusMsg = document.getElementById('train-status');
const todayChartEl = document.getElementById('todayChart');
const tomorrowChartEl = document.getElementById('tomorrowChart');

// Format Currency
const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
};

// Fetch Prediction Data
const fetchPrediction = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/predict`);
        if (!response.ok) {
            throw new Error('Prediction API failed');
        }
        
        const data = await response.json();
        
        // Remove placeholder classes
        currentPriceEl.classList.remove('placeholder');
        predictedPriceEl.classList.remove('placeholder');
        
        currentPriceEl.textContent = formatCurrency(data.current_price);
        predictedPriceEl.textContent = formatCurrency(data.predicted_price);
        currentDateEl.textContent = data.last_update;

        // Calculate Diff
        const diff = data.predicted_price - data.current_price;
        const percentChange = (Math.abs(diff) / data.current_price) * 100;
        
        if (diff >= 0) {
            trendIconEl.textContent = '📈';
            trendValueEl.textContent = `+${formatCurrency(diff)} (+${percentChange.toFixed(2)}%)`;
            trendValueEl.className = 'up';
        } else {
            trendIconEl.textContent = '📉';
            trendValueEl.textContent = `-${formatCurrency(Math.abs(diff))} (-${percentChange.toFixed(2)}%)`;
            trendValueEl.className = 'down';
        }
    } catch (error) {
        console.error('Error fetching prediction:', error);
        currentPriceEl.textContent = 'Error';
        predictedPriceEl.textContent = 'Error';
        currentPriceEl.classList.remove('placeholder');
        predictedPriceEl.classList.remove('placeholder');
    }
};

// Fetch Chart Data
let priceChartInstance = null;
let todayChartInstance = null;
let tomorrowChartInstance = null;

const renderMiniCharts = (data) => {
    const labelsCount = data.dates.length;
    const currentDate = labelsCount > 0 ? data.dates[labelsCount - 1] : 'Today';
    const previousDate = labelsCount > 1 ? data.dates[labelsCount - 2] : currentDate;
    const currentClose = data.historical_prices[labelsCount - 1] ?? 0;
    const previousClose = data.historical_prices[labelsCount - 2] ?? currentClose;

    const todayLabels = [previousDate, currentDate];
    const todayData = [previousClose, currentClose];

    const tomorrowLabels = [currentDate, data.predicted_date];
    const tomorrowData = [currentClose, data.predicted_price];

    const chartOptions = {
        type: 'line',
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return formatCurrency(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                x: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255, 255, 255, 0.08)' } },
                y: { ticks: { color: '#9ca3af', callback: (value) => '$' + value }, grid: { color: 'rgba(255, 255, 255, 0.08)' } }
            }
        }
    };

    if (todayChartInstance) todayChartInstance.destroy();
    if (tomorrowChartInstance) tomorrowChartInstance.destroy();

    todayChartInstance = new Chart(todayChartEl.getContext('2d'), {
        ...chartOptions,
        data: {
            labels: todayLabels,
            datasets: [{
                label: 'Today',
                data: todayData,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                borderWidth: 2,
                pointRadius: 3,
                tension: 0.4,
                fill: true
            }]
        }
    });

    tomorrowChartInstance = new Chart(tomorrowChartEl.getContext('2d'), {
        ...chartOptions,
        data: {
            labels: tomorrowLabels,
            datasets: [{
                label: 'Tomorrow',
                data: tomorrowData,
                borderColor: '#fbbf24',
                backgroundColor: 'rgba(251, 191, 36, 0.15)',
                borderWidth: 2,
                pointRadius: 3,
                tension: 0.4,
                fill: true
            }]
        }
    });
};

const renderChart = (data) => {
    const ctx = document.getElementById('priceChart').getContext('2d');
    
    // All labels (dates)
    const labels = [...data.dates, data.predicted_date];
    
    // Historical prices array matches dates exactly, then add null for predicted date
    const historicalData = [...data.historical_prices, null];
    
    // Predicted line: null for all historical dates except the LAST historical date to connect the line
    const predictedData = Array(data.historical_prices.length).fill(null);
    predictedData[data.historical_prices.length - 1] = data.historical_prices[data.historical_prices.length - 1]; // connect
    predictedData.push(data.predicted_price);
    
    if (priceChartInstance) {
        priceChartInstance.destroy();
    }
    
    priceChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Historical Price',
                    data: historicalData,
                    borderColor: '#3b82f6', // blue
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    pointRadius: 3,
                    fill: true
                },
                {
                    label: 'Predicted Forecast',
                    data: predictedData,
                    borderColor: '#9ca3af', // gray
                    borderDash: [5, 5],
                    borderWidth: 2,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#9ca3af',
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: '#e5e7eb' }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) { label += ': '; }
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#9ca3af' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y: {
                    ticks: { 
                        color: '#9ca3af',
                        callback: function(value) {
                            return '$' + value;
                        }
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            }
        }
    });
    renderMiniCharts(data);
};

const fetchChartData = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/chart`);
        if (response.ok) {
            const data = await response.json();
            renderChart(data);
        }
    } catch (error) {
        console.error('Error fetching chart data:', error);
    }
};

// Train Model Handler
const handleTrainModel = async () => {
    trainBtn.disabled = true;
    btnText.classList.add('hidden');
    btnLoader.classList.remove('hidden');
    statusMsg.classList.add('hidden');
    statusMsg.className = 'status-msg hidden';
    
    try {
        const response = await fetch(`${API_BASE_URL}/train`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            statusMsg.textContent = `Model retrained successfully! MAE: ${formatCurrency(data.mae)}`;
            statusMsg.classList.add('success');
            // Refresh prediction
            await fetchPrediction();
            await fetchChartData();
        } else {
             throw new Error(data.detail || 'Training failed');
        }
    } catch (error) {
        console.error('Training Error:', error);
        statusMsg.textContent = `Error: ${error.message}`;
        statusMsg.classList.add('error');
    } finally {
        trainBtn.disabled = false;
        btnText.classList.remove('hidden');
        btnLoader.classList.add('hidden');
        statusMsg.classList.remove('hidden');
    }
};

// Event Listeners
trainBtn.addEventListener('click', handleTrainModel);

// Initial Fetch
document.addEventListener('DOMContentLoaded', () => {
    fetchPrediction();
    fetchChartData();
});
