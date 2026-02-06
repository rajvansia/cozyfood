const SHEET_NAMES = {
  grocery: 'GroceryItems',
  meals: 'Meals',
  ingredients: 'MealIngredients',
  weekly: 'WeeklyPlan',
  history: 'WeeklyPlanHistory'
};

function doGet(e) {
  return handleRequest_(e, 'GET');
}

function doPost(e) {
  const override = (e.parameter && (e.parameter.method || e.parameter._method)) || '';
  const method = override ? override.toUpperCase() : 'POST';
  return handleRequest_(e, method);
}

function handleRequest_(e, method) {
  const path = (e.pathInfo || '').replace(/^\//, '');
  const segments = path ? path.split('/') : [];

  try {
    if (segments[0] === 'grocery-items') {
      return handleGrocery_(method, segments[1], e);
    }
    if (segments[0] === 'meals') {
      return handleMeals_(method, segments[1], e);
    }
    if (segments[0] === 'weekly-plan') {
      return handleWeekly_(method, e);
    }
    if (segments[0] === 'weekly-plan-history') {
      return handleHistory_(method, e);
    }
    if (segments[0] === 'generate-grocery-list') {
      return handleGenerate_(e);
    }

    return jsonResponse_({ error: 'Not found' }, 404);
  } catch (error) {
    return jsonResponse_({ error: error.message || 'Server error' }, 500);
  }
}

function handleGrocery_(method, id, e) {
  if (method === 'GET') {
    return jsonResponse_(getAll_(SHEET_NAMES.grocery));
  }
  if (method === 'POST') {
    const body = parseBody_(e);
    if (!body.weekStart) {
      body.weekStart = getWeekStartKey_();
    }
    appendRow_(SHEET_NAMES.grocery, body);
    return jsonResponse_(body, 201);
  }
  if (method === 'PATCH') {
    const body = parseBody_(e);
    updateRow_(SHEET_NAMES.grocery, id, body);
    return jsonResponse_(body);
  }
  if (method === 'DELETE') {
    deleteRow_(SHEET_NAMES.grocery, id);
    return jsonResponse_({ ok: true });
  }
  return jsonResponse_({ error: 'Method not allowed' }, 405);
}

function handleMeals_(method, id, e) {
  if (method === 'GET') {
    const meals = getAll_(SHEET_NAMES.meals);
    const ingredients = getAll_(SHEET_NAMES.ingredients);
    const grouped = meals.map((meal) => ({
      ...meal,
      ingredients: ingredients.filter((ingredient) => ingredient.mealId === meal.id)
    }));
    return jsonResponse_(grouped);
  }
  if (method === 'POST') {
    const body = parseBody_(e);
    appendRow_(SHEET_NAMES.meals, { id: body.id, mealName: body.mealName, notes: body.notes });
    body.ingredients.forEach((ingredient) => {
      appendRow_(SHEET_NAMES.ingredients, {
        mealId: body.id,
        ingredient: ingredient.ingredient,
        quantity: ingredient.quantity,
        unit: ingredient.unit
      });
    });
    return jsonResponse_(body, 201);
  }
  if (method === 'PUT') {
    const body = parseBody_(e);
    updateRow_(SHEET_NAMES.meals, id, { id, mealName: body.mealName, notes: body.notes });
    replaceIngredients_(id, body.ingredients || []);
    return jsonResponse_(body);
  }
  if (method === 'DELETE') {
    deleteRow_(SHEET_NAMES.meals, id);
    deleteIngredients_(id);
    return jsonResponse_({ ok: true });
  }
  return jsonResponse_({ error: 'Method not allowed' }, 405);
}

function handleWeekly_(method, e) {
  if (method === 'GET') {
    return jsonResponse_(getWeekly_());
  }
  if (method === 'PUT') {
    const body = parseBody_(e);
    saveWeekly_(body);
    return jsonResponse_(body);
  }
  return jsonResponse_({ error: 'Method not allowed' }, 405);
}

function handleHistory_(method, e) {
  if (method === 'GET') {
    return jsonResponse_(getWeeklyHistory_());
  }
  if (method === 'POST') {
    const body = parseBody_(e);
    saveWeeklyHistory_(body);
    return jsonResponse_(body, 201);
  }
  return jsonResponse_({ error: 'Method not allowed' }, 405);
}

function handleGenerate_(e) {
  const plan = parseBody_(e);
  const meals = getAll_(SHEET_NAMES.meals);
  const ingredients = getAll_(SHEET_NAMES.ingredients);
  const grocery = getAll_(SHEET_NAMES.grocery);
  const weekStart = getWeekStartKey_();

  const mealMap = meals.reduce((map, meal) => {
    map[meal.id] = meal;
    return map;
  }, {});

  const aggregated = {};
  Object.keys(plan).forEach((day) => {
    const mealId = plan[day];
    if (!mealId) return;
    ingredients
      .filter((row) => row.mealId === mealId)
      .forEach((row) => {
        const key = `${row.ingredient.toLowerCase()}|${row.unit || ''}`;
        if (!aggregated[key]) {
          aggregated[key] = { ...row, quantity: Number(row.quantity) || 0 };
        } else {
          aggregated[key].quantity += Number(row.quantity) || 0;
        }
      });
  });

  const existingMap = grocery.reduce((map, item) => {
    const itemWeek = item.weekStart || weekStart;
    if (itemWeek !== weekStart) return map;
    map[`${item.name.toLowerCase()}|${item.unit || ''}`] = item;
    return map;
  }, {});

  Object.keys(aggregated).forEach((key) => {
    const item = aggregated[key];
    if (existingMap[key]) {
      const updated = {
        quantity: Number(existingMap[key].quantity) + Number(item.quantity || 0),
        checked: false,
        weekStart: weekStart,
        updatedAt: new Date().toISOString()
      };
      updateRow_(SHEET_NAMES.grocery, existingMap[key].id, updated);
    } else {
      appendRow_(SHEET_NAMES.grocery, {
        id: Utilities.getUuid(),
        name: item.ingredient,
        quantity: item.quantity,
        unit: item.unit,
        category: 'pantry',
        checked: false,
        weekStart: weekStart,
        updatedAt: new Date().toISOString()
      });
    }
  });

  return jsonResponse_({ ok: true, added: Object.keys(aggregated).length });
}

function getAll_(sheetName) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).map((row) => {
    return headers.reduce((acc, header, index) => {
      acc[header] = row[index];
      return acc;
    }, {});
  });
}

function appendRow_(sheetName, data) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  const headers = sheet.getDataRange().getValues()[0];
  const row = headers.map((header) => data[header] ?? '');
  sheet.appendRow(row);
}

function updateRow_(sheetName, id, data) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idIndex = headers.indexOf('id');
  for (var i = 1; i < values.length; i++) {
    if (values[i][idIndex] === id) {
      headers.forEach((header, index) => {
        if (data[header] !== undefined) {
          sheet.getRange(i + 1, index + 1).setValue(data[header]);
        }
      });
      return;
    }
  }
}

function deleteRow_(sheetName, id) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idIndex = headers.indexOf('id');
  for (var i = 1; i < values.length; i++) {
    if (values[i][idIndex] === id) {
      sheet.deleteRow(i + 1);
      return;
    }
  }
}

function replaceIngredients_(mealId, ingredients) {
  deleteIngredients_(mealId);
  ingredients.forEach((ingredient) => {
    appendRow_(SHEET_NAMES.ingredients, {
      mealId: mealId,
      ingredient: ingredient.ingredient,
      quantity: ingredient.quantity,
      unit: ingredient.unit
    });
  });
}

function deleteIngredients_(mealId) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAMES.ingredients);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idIndex = headers.indexOf('mealId');
  for (var i = values.length - 1; i >= 1; i--) {
    if (values[i][idIndex] === mealId) {
      sheet.deleteRow(i + 1);
    }
  }
}

function getWeekly_() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAMES.weekly);
  if (!sheet) return {};
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return {};
  const headers = values[0];
  const output = {};
  for (var i = 1; i < values.length; i++) {
    const row = values[i];
    const day = row[headers.indexOf('day')];
    const mealId = row[headers.indexOf('mealId')];
    if (day) output[day] = mealId || null;
  }
  return output;
}

function saveWeekly_(plan) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAMES.weekly);
  const headers = sheet.getDataRange().getValues()[0];
  sheet.getRange(2, 1, sheet.getLastRow(), headers.length).clearContent();
  Object.keys(plan).forEach((day, index) => {
    sheet.getRange(2 + index, 1).setValue(day);
    sheet.getRange(2 + index, 2).setValue(plan[day] || '');
  });
}

function getWeekStartKey_() {
  var today = new Date();
  var day = today.getDay();
  var diff = day === 0 ? -6 : 1 - day;
  var monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  var year = monday.getFullYear();
  var month = ('0' + (monday.getMonth() + 1)).slice(-2);
  var date = ('0' + monday.getDate()).slice(-2);
  return year + '-' + month + '-' + date;
}

function getWeeklyHistory_() {
  const rows = getAll_(SHEET_NAMES.history);
  if (!rows.length) return [];
  const grouped = {};
  rows.forEach((row) => {
    if (!row.weekStart || !row.savedAt) return;
    const key = `${row.weekStart}__${row.savedAt}`;
    if (!grouped[key]) {
      grouped[key] = { weekStart: row.weekStart, savedAt: row.savedAt, days: {} };
    }
    if (row.day) {
      grouped[key].days[row.day] = row.mealId || null;
    }
  });

  const byWeek = {};
  Object.keys(grouped).forEach((key) => {
    const snapshot = grouped[key];
    const existing = byWeek[snapshot.weekStart];
    if (!existing || snapshot.savedAt > existing.savedAt) {
      byWeek[snapshot.weekStart] = snapshot;
    }
  });

  return Object.keys(byWeek)
    .sort()
    .reverse()
    .map((weekStart) => byWeek[weekStart]);
}

function saveWeeklyHistory_(snapshot) {
  if (!snapshot || !snapshot.weekStart || !snapshot.days) return;
  deleteHistoryWeek_(snapshot.weekStart);
  const savedAt = snapshot.savedAt || new Date().toISOString();
  Object.keys(snapshot.days).forEach((day) => {
    appendRow_(SHEET_NAMES.history, {
      weekStart: snapshot.weekStart,
      day: day,
      mealId: snapshot.days[day] || '',
      savedAt: savedAt
    });
  });
}

function deleteHistoryWeek_(weekStart) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAMES.history);
  if (!sheet) return;
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return;
  const headers = values[0];
  const index = headers.indexOf('weekStart');
  for (var i = values.length - 1; i >= 1; i--) {
    if (values[i][index] === weekStart) {
      sheet.deleteRow(i + 1);
    }
  }
}

function parseBody_(e) {
  if (!e.postData || !e.postData.contents) return {};
  return JSON.parse(e.postData.contents);
}

function jsonResponse_(data, code) {
  // Apps Script TextOutput always returns 200; adjust as needed if you use HtmlOutput.
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON
  );
}
