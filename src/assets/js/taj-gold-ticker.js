/* ==========================================================================
   1. GOLD TICKER ENGINE (Client-Side Rebuild)
   ========================================================================== */

   class TajGoldTicker {
    constructor() {
        this.apiKey = 'goldapi-pu7is19ml6le3ig-io';
        this.url = 'https://www.goldapi.io/api/XAU/SAR';
        this.cacheKey = 'taj_gold_v34';
        this.cacheTime = 4 * 60 * 60 * 1000; // 4 Hours in milliseconds
        this.svgUrl = 'https://tajalameera.com/wp-content/uploads/2026/02/Saudi_Riyal_Symbol-2.svg';
        
        this.init();
    }

    async init() {
        const data = await this.getGoldPrices();
        this.renderTicker(data);
    }

    async getGoldPrices() {
        // 1. Check LocalStorage Cache (Replaces WP get_transient)
        const cached = localStorage.getItem(this.cacheKey);
        if (cached) {
            const parsed = JSON.parse(cached);
            if (Date.now() - parsed.timestamp < this.cacheTime) {
                return parsed.data;
            }
        }

        // 2. Fetch fresh data if expired or missing
        try {
            const response = await fetch(this.url, {
                headers: {
                    'x-access-token': this.apiKey,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) throw new Error('API Error');
            const data = await response.json();
            
            const timeStr = new Date().toLocaleTimeString('ar-SA', { 
                hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Riyadh' 
            });
            
            const prices = {
                '24k': parseFloat(data.price_gram_24k).toFixed(2),
                '21k': parseFloat(data.price_gram_21k).toFixed(2),
                '18k': parseFloat(data.price_gram_18k).toFixed(2),
                'change': parseFloat(data.ch),
                'time': timeStr
            };

            // 3. Save to Cache (Replaces WP set_transient)
            localStorage.setItem(this.cacheKey, JSON.stringify({
                timestamp: Date.now(),
                data: prices
            }));

            return prices;
        } catch (error) {
            console.error("Taj Gold Ticker Error:", error);
            return null;
        }
    }

    renderTicker(prices) {
        let p24 = '...', p21 = '...', p18 = '...', arrow = '', colorClass = 'up', timeStr = 'يتم التحديث';
        
        if (prices) {
            p24 = prices['24k'];
            p21 = prices['21k'];
            p18 = prices['18k'];
            arrow = prices.change >= 0 ? '▲' : '▼';
            colorClass = prices.change >= 0 ? 'up' : 'down';
            timeStr = prices.time;
        }

        const html = `
            <div class="taj-track">
                ${Array(4).fill(0).map(() => `
                <div class="taj-group">
                    <div class="taj-item">
                        <span class="taj-pulse"></span>
                        <span class="taj-label">ذهب عيار 24</span>
                        <strong class="${colorClass}">
                            <span class="taj-sar-icon" style="-webkit-mask-image: url('${this.svgUrl}'); mask-image: url('${this.svgUrl}');"></span>
                            ${p24} ${arrow}
                        </strong>
                    </div>
                    <div class="taj-item">
                        <span class="taj-pulse"></span>
                        <span class="taj-label">ذهب عيار 21</span>
                        <strong class="${colorClass}">
                            <span class="taj-sar-icon" style="-webkit-mask-image: url('${this.svgUrl}'); mask-image: url('${this.svgUrl}');"></span>
                            ${p21} ${arrow}
                        </strong>
                    </div>
                    <div class="taj-item">
                        <span class="taj-pulse"></span>
                        <span class="taj-label">ذهب عيار 18</span>
                        <strong class="${colorClass}">
                            <span class="taj-sar-icon" style="-webkit-mask-image: url('${this.svgUrl}'); mask-image: url('${this.svgUrl}');"></span>
                            ${p18} ${arrow}
                        </strong>
                    </div>
                    <div class="taj-item" style="flex-direction: row;">
                        <span class="taj-time">آخر تحديث: ${timeStr}</span>
                    </div>
                </div>`).join('')}
            </div>
        `;

        const wrapper = document.createElement('div');
        wrapper.className = 'taj-ticker-wrap';
        wrapper.innerHTML = html;
        
        document.body.prepend(wrapper);
        document.body.classList.add('has-taj-ticker');
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new TajGoldTicker();
});