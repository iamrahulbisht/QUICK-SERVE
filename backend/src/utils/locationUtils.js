// Haversine formula to calculate distance between two coordinates
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

const toRadians = (degrees) => {
    return degrees * (Math.PI / 180);
};

// Calculate delivery fee based on distance
const calculateDeliveryFee = (distance) => {
    const baseFee = 20;
    const freeDeliveryDistance = 3; // First 3km free
    const perKmCharge = 5;
    
    if (distance <= freeDeliveryDistance) {
        return baseFee;
    }
    
    const extraDistance = distance - freeDeliveryDistance;
    const totalFee = baseFee + Math.ceil(extraDistance) * perKmCharge;
    
    return totalFee;
};

// Estimate delivery time based on distance
const estimateDeliveryTime = (distance) => {
    const baseTime = 20; // Base time in minutes
    const timePerKm = 5; // 5 minutes per km
    
    const totalTime = baseTime + Math.ceil(distance * timePerKm);
    const minTime = totalTime - 5;
    const maxTime = totalTime + 10;
    
    return `${minTime}-${maxTime} mins`;
};

module.exports = {
    calculateDistance,
    calculateDeliveryFee,
    estimateDeliveryTime
};
