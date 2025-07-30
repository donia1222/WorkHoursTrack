export interface ParsedWorkData {
  personName: string;
  workDays: {
    date: string;
    dayName: string;
    dayNumber: number;
  }[];
  freeDays: {
    date: string;
    dayName: string;
    dayNumber: number;
  }[];
  vacations: string[];
  sickness: string[];
  schedule: string;
  observations: string;
  // Nuevo: campos para permitir al usuario especificar el mes/año
  needsMonthYear?: boolean;
}

export class ChatDataParser {
  
  /**
   * Detecta si un mensaje contiene datos de horarios de trabajo
   */
  static hasWorkScheduleData(text: string): boolean {
    const patterns = [
      // Español
      '📅 **DÍAS DE TRABAJO:**',
      '🏖️ **DÍAS LIBRES:**',
      '✈️ **VACACIONES:**',
      '👤 **PERSONA:**',
      'PERSONA:',
      'DÍAS DE TRABAJO:',
      'DÍAS LIBRES:',
      // Inglés
      '📅 **WORK DAYS:**',
      '🏖️ **FREE DAYS:**',
      '✈️ **VACATION:**',
      '👤 **PERSON:**',
      'PERSON:',
      'WORK DAYS:',
      'FREE DAYS:',
      // Alemán
      '📅 **ARBEITSTAGE:**',
      '🏖️ **FREIE TAGE:**',
      '✈️ **URLAUB:**',
      '👤 **PERSON:**',
      'PERSON:',
      'ARBEITSTAGE:',
      'FREIE TAGE:',
      // Francés
      '📅 **JOURS DE TRAVAIL:**',
      '🏖️ **JOURS LIBRES:**',
      '✈️ **VACANCES:**',
      '👤 **PERSONNE:**',
      'PERSONNE:',
      'JOURS DE TRAVAIL:',
      'JOURS LIBRES:',
      // Italiano
      '📅 **GIORNI DI LAVORO:**',
      '🏖️ **GIORNI LIBERI:**',
      '✈️ **VACANZE:**',
      '👤 **PERSONA:**',
      'PERSONA:',
      'GIORNI DI LAVORO:',
      'GIORNI LIBERI:'
    ];
    
    return patterns.some(pattern => text.includes(pattern));
  }

  /**
   * Parsea el texto del bot y extrae los datos estructurados
   */
  static parseWorkSchedule(text: string): ParsedWorkData | null {
    try {
      console.log('🔍 [PARSER] Iniciando parseo de texto:', text.substring(0, 200) + '...');
      
      // Extraer nombre de la persona (multiidioma)
      const personMatch = text.match(/👤 \*\*(PERSONA|PERSON|PERSONNE):\*\* (.+)/i) || 
                         text.match(/(PERSONA|PERSON|PERSONNE): (.+)/i);
      const personName = personMatch ? personMatch[personMatch.length - 1].trim() : '';
      console.log('👤 [PARSER] Persona encontrada:', personName);

      // Extraer días de trabajo (multiidioma)
      const workDaysMatch = text.match(/📅 \*\*(DÍAS DE TRABAJO|ARBEITSTAGE|WORK DAYS|JOURS DE TRAVAIL|GIORNI DI LAVORO):\*\*\s*\n([^🏖️]*?)(?=🏖️|\n\n|$)/s) ||
                           text.match(/(DÍAS DE TRABAJO|ARBEITSTAGE|WORK DAYS|JOURS DE TRAVAIL|GIORNI DI LAVORO):\s*\n([^🏖️]*?)(?=🏖️|\n\n|$)/s);
      const workDaysText = workDaysMatch ? workDaysMatch[2].trim() : '';
      console.log('📅 [PARSER] Días de trabajo encontrados:', workDaysText);
      
      // Extraer horario (multiidioma)
      const scheduleMatch = text.match(/• \*\*(Horario|Zeitplan|Schedule|Horaire|Orario):\*\* (.+)/i) ||
                           text.match(/(Horario|Zeitplan|Schedule|Horaire|Orario): (.+)/i);
      const schedule = scheduleMatch ? scheduleMatch[scheduleMatch.length - 1].trim() : '';
      console.log('⏰ [PARSER] Horario encontrado:', schedule);

      // Extraer días libres (multiidioma)
      const freeDaysMatch = text.match(/🏖️ \*\*(DÍAS LIBRES|FREIE TAGE|FREE DAYS|JOURS LIBRES|GIORNI LIBERI):\*\*\s*\n([^✈️🏥📝]*?)(?=\n\n|✈️|🏥|📝|$)/s) ||
                           text.match(/(DÍAS LIBRES|FREIE TAGE|FREE DAYS|JOURS LIBRES|GIORNI LIBERI):\s*\n([^✈️🏥📝]*?)(?=\n\n|✈️|🏥|📝|$)/s);
      const freeDaysText = freeDaysMatch ? freeDaysMatch[2].trim() : '';

      // Extraer vacaciones (multiidioma)
      const vacationsMatch = text.match(/✈️ \*\*(VACACIONES|URLAUB|VACATION|VACANCES|VACANZE):\*\* (.+)/i) ||
                            text.match(/(VACACIONES|URLAUB|VACATION|VACANCES|VACANZE): (.+)/i);
      const vacationsText = vacationsMatch ? vacationsMatch[vacationsMatch.length - 1].trim() : '';

      // Extraer enfermedad (multiidioma)
      const sicknessMatch = text.match(/🏥 \*\*(ENFERMEDAD|KRANKHEIT|SICKNESS|MALADIE|MALATTIA):\*\* (.+)/i) ||
                           text.match(/(ENFERMEDAD|KRANKHEIT|SICKNESS|MALADIE|MALATTIA): (.+)/i);
      const sicknessText = sicknessMatch ? sicknessMatch[sicknessMatch.length - 1].trim() : '';

      // Extraer observaciones (multiidioma)
      const observationsMatch = text.match(/📝 \*\*(OBSERVACIONES|BEMERKUNGEN|OBSERVATIONS|OBSERVATIONS|OSSERVAZIONI):\*\* (.+)/i) ||
                               text.match(/(OBSERVACIONES|BEMERKUNGEN|OBSERVATIONS|OBSERVATIONS|OSSERVAZIONI): (.+)/i);
      const observations = observationsMatch ? observationsMatch[observationsMatch.length - 1].trim() : '';

      // Parsear días de trabajo
      const workDays = this.parseDaysList(workDaysText);
      console.log('📊 [PARSER] Work days parseados:', workDays);
      
      // Parsear días libres
      const freeDays = this.parseDaysList(freeDaysText);
      console.log('📊 [PARSER] Free days parseados:', freeDays);

      // Parsear vacaciones (multiidioma)
      let vacations: string[] = [];
      const noVacationTerms = ['No especificadas', 'Ninguna registrada', 'Not specified', 'None registered', 'Nicht angegeben', 'Keine registriert', 'Non spécifiées', 'Aucune enregistrée', 'Non specificate', 'Nessuna registrata'];
      if (vacationsText && !noVacationTerms.some(term => vacationsText.includes(term))) {
        vacations = [vacationsText];
      }

      // Parsear enfermedad (multiidioma)
      let sickness: string[] = [];
      const noSicknessTerms = ['Ninguna registrada', 'No especificadas', 'None registered', 'Not specified', 'Keine registriert', 'Nicht angegeben', 'Aucune enregistrée', 'Non spécifiées', 'Nessuna registrata', 'Non specificate'];
      if (sicknessText && !noSicknessTerms.some(term => sicknessText.includes(term))) {
        sickness = [sicknessText];
      }

      const result = {
        personName,
        workDays,
        freeDays,
        vacations,
        sickness,
        schedule,
        observations,
        needsMonthYear: workDays.length > 0 || freeDays.length > 0 // Si encontramos días, necesitamos mes/año
      };

      console.log('✅ [PARSER] Resultado final:', result);
      return result;

    } catch (error) {
      console.error('Error parsing work schedule:', error);
      return null;
    }
  }

  /**
   * Parsea una lista de días como "Lunes 2, Martes 3, Miércoles 4..."
   * Solo extrae los números de día, ignora los nombres de días de la semana
   */
  private static parseDaysList(daysText: string): { date: string; dayName: string; dayNumber: number }[] {
    if (!daysText) return [];

    const days: { date: string; dayName: string; dayNumber: number }[] = [];
    
    // Expresión regular para capturar "Día X" donde X es un número (multiidioma)
    const dayPattern = /(Lunes|Martes|Miércoles|Jueves|Viernes|Sábado|Domingo|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag|Lundi|Mardi|Mercredi|Jeudi|Vendredi|Samedi|Dimanche|Lunedì|Martedì|Mercoledì|Giovedì|Venerdì|Sabato|Domenica)\s+(\d+)/gi;
    let match;

    while ((match = dayPattern.exec(daysText)) !== null) {
      const originalDayName = match[1];
      const dayNumber = parseInt(match[2]);
      
      // NO generar fecha aquí - solo guardar el número del día
      // La fecha se generará correctamente cuando el usuario seleccione mes/año
      days.push({
        date: '', // Se llenará después con el mes/año correcto
        dayName: originalDayName, // Mantener el nombre original del PDF
        dayNumber
      });
    }

    console.log('📊 [PARSER] Días extraídos (solo números):', days.map(d => `${d.dayName} ${d.dayNumber}`));
    return days;
  }

  /**
   * Actualiza las fechas de los datos parseados con el mes y año especificados
   */
  static updateDatesWithMonthYear(parsedData: ParsedWorkData, year: number, month: number): ParsedWorkData {
    const updateDatesList = (daysList: { date: string; dayName: string; dayNumber: number }[]) => {
      return daysList.map(day => ({
        ...day,
        date: new Date(year, month - 1, day.dayNumber).toISOString().split('T')[0]
      }));
    };

    return {
      ...parsedData,
      workDays: updateDatesList(parsedData.workDays),
      freeDays: updateDatesList(parsedData.freeDays),
      needsMonthYear: false
    };
  }

  /**
   * Convierte datos parseados al formato WorkDay del calendario
   */
  static convertToWorkDays(parsedData: ParsedWorkData, jobId: string): any[] {
    const workDays: any[] = [];
    
    // Agregar días de trabajo
    parsedData.workDays.forEach(day => {
      // Parsear horario
      let startTime = '';
      let endTime = '';
      let secondStartTime = '';
      let secondEndTime = '';
      let hasSpecificSchedule = false;
      
      if (parsedData.schedule && parsedData.schedule !== 'K' && !parsedData.schedule.includes('Probablemente')) {
        // Detectar horarios como "09:00-14:00" o "09:00 a 14:00 y de 17:00 a 19:00"
        const timePattern = /(\d{1,2}:\d{2})\s*[-a]\s*(\d{1,2}:\d{2})/g;
        const matches = [...parsedData.schedule.matchAll(timePattern)];
        
        if (matches.length > 0) {
          startTime = matches[0][1];
          endTime = matches[0][2];
          hasSpecificSchedule = true;
          
          // Si hay segundo turno
          if (matches.length > 1) {
            secondStartTime = matches[1][1];
            secondEndTime = matches[1][2];
          }
        }
      }

      // Calcular horas trabajadas
      let hours = 8; // Valor por defecto
      if (hasSpecificSchedule && startTime && endTime) {
        const start = new Date(`2000-01-01T${startTime}:00`);
        const end = new Date(`2000-01-01T${endTime}:00`);
        hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        
        // Agregar segundo turno si existe
        if (secondStartTime && secondEndTime) {
          const secondStart = new Date(`2000-01-01T${secondStartTime}:00`);
          const secondEnd = new Date(`2000-01-01T${secondEndTime}:00`);
          hours += (secondEnd.getTime() - secondStart.getTime()) / (1000 * 60 * 60);
        }
      }

      // Solo agregar si la fecha no está vacía
      if (day.date && day.date !== '') {
        workDays.push({
          date: day.date,
          type: 'work',
          jobId: jobId,
          // Solo incluir horarios específicos si realmente los hay
          startTime: hasSpecificSchedule ? startTime : undefined,
          endTime: hasSpecificSchedule ? endTime : undefined,
          secondStartTime: hasSpecificSchedule && secondStartTime ? secondStartTime : undefined,
          secondEndTime: hasSpecificSchedule && secondEndTime ? secondEndTime : undefined,
          hours: Math.max(hours, 0),
          overtime: false,
          notes: parsedData.observations || ''
        });
      } else {
        console.warn('⚠️ [PARSER] Skipping work day with empty date:', day);
      }
    });

    // Agregar días libres (asignarlos al mismo trabajo seleccionado)
    parsedData.freeDays.forEach(day => {
      // Solo agregar si la fecha no está vacía
      if (day.date && day.date !== '') {
        workDays.push({
          date: day.date,
          type: 'free',
          jobId: jobId, // Asignar al mismo trabajo que los días de trabajo
          hours: 0,
          overtime: false,
          notes: 'Día libre'
        });
      } else {
        console.warn('⚠️ [PARSER] Skipping free day with empty date:', day);
      }
    });

    return workDays;
  }
}