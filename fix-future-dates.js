// Script para limpiar registros con fechas futuras
import AsyncStorage from '@react-native-async-storage/async-storage';

const fixFutureDates = async () => {
  try {
    const workDaysData = await AsyncStorage.getItem('work_days_v2');
    if (!workDaysData) {
      console.log('No work days found');
      return;
    }

    let workDays = JSON.parse(workDaysData);
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    
    console.log(`Today is: ${todayString}`);
    
    // Find future dates
    const futureDays = workDays.filter(day => day.date > todayString);
    console.log(`Found ${futureDays.length} days with future dates:`);
    futureDays.forEach(day => console.log(`  - ${day.date} (${day.hours}h)`));
    
    // Remove future dates
    const cleanedWorkDays = workDays.filter(day => day.date <= todayString);
    
    console.log(`Removing ${futureDays.length} future entries...`);
    console.log(`Keeping ${cleanedWorkDays.length} valid entries`);
    
    // Save cleaned data
    await AsyncStorage.setItem('work_days_v2', JSON.stringify(cleanedWorkDays));
    console.log('✅ Future dates cleaned successfully!');
    
  } catch (error) {
    console.error('Error fixing future dates:', error);
  }
};

// Call the function
fixFutureDates();