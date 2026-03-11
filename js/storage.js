class ProgressStorage {
    constructor() {
        this.storageKey = 'english_coach_progress';
        this.dailyData = this.loadTodayData();
    }

    loadTodayData() {
        const today = new Date().toDateString();
        const allData = this.getAllData();
        
        if (!allData[today]) {
            allData[today] = {
                date: today,
                sessions: [],
                averageSpeed: 0,
                averageFluency: 0
            };
        }
        
        return allData[today];
    }

    getAllData() {
        const data = localStorage.getItem(this.storageKey);
        return data ? JSON.parse(data) : {};
    }

    saveSession(sessionData) {
        const allData = this.getAllData();
        const today = new Date().toDateString();
        
        if (!allData[today]) {
            allData[today] = {
                date: today,
                sessions: [],
                averageSpeed: 0,
                averageFluency: 0
            };
        }
        
        allData[today].sessions.push({
            timestamp: new Date().toISOString(),
            ...sessionData
        });
        
        // Calculate averages
        const sessions = allData[today].sessions;
        allData[today].averageSpeed = sessions.reduce((sum, s) => sum + s.speed, 0) / sessions.length;
        allData[today].averageFluency = sessions.reduce((sum, s) => sum + s.fluency, 0) / sessions.length;
        
        localStorage.setItem(this.storageKey, JSON.stringify(allData));
        this.dailyData = allData[today];
        
        return allData[today];
    }

    getLast7Days() {
        const allData = this.getAllData();
        const last7Days = [];
        const today = new Date();
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toDateString();
            
            last7Days.push({
                date: dateStr,
                data: allData[dateStr] || { averageSpeed: 0, averageFluency: 0 }
            });
        }
        
        return last7Days;
    }
}

const storage = new ProgressStorage();