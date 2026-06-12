export function formatDistanceToNow(dateString: string) {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return "vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 30) return `${diffDays} ngày trước`;
    
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) return `${diffMonths} tháng trước`;
    
    return `${Math.floor(diffMonths / 12)} năm trước`;
  } catch (error) {
    return dateString;
  }
}

export function formatDate(dateString: string) {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch (error) {
    return dateString;
  }
}

export function formatShortDate(dateString: string) {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      month: "short",
      day: "numeric",
    });
  } catch (error) {
    return dateString;
  }
}

export function getDaysCountdown(dateString: string) {
  try {
    const now = new Date();
    const target = new Date(dateString);
    // Set hours to 0 to compare days properly
    now.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    
    const diffTime = target.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  } catch (error) {
    return 0;
  }
}

export function calculateDetailedTime(startDateStr: string) {
  try {
    const start = new Date(startDateStr);
    const now = new Date();
    
    const diffMs = now.getTime() - start.getTime();
    const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = now.getHours(); // simplified breakdown
    
    // Approximate breakdown
    const years = Math.floor(totalDays / 365);
    const months = Math.floor((totalDays % 365) / 30);
    const days = (totalDays % 365) % 30;
    
    return {
      totalDays,
      years,
      months,
      days,
      hours
    };
  } catch (error) {
    return { totalDays: 0, years: 0, months: 0, days: 0, hours: 0 };
  }
}
