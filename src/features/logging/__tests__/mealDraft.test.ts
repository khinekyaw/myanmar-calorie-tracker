import { useMealDraft } from '../mealDraft';

describe('useMealDraft', () => {
  beforeEach(() => useMealDraft.getState().clear());

  it('holds edits apart from the meal until cleared', () => {
    const { start, setItems } = useMealDraft.getState();
    start('meal-1', [{ dishId: 'rice', qty: 1 }]);
    setItems([{ dishId: 'rice', qty: 2 }]);
    expect(useMealDraft.getState()).toMatchObject({ id: 'meal-1', items: [{ dishId: 'rice', qty: 2 }] });
    useMealDraft.getState().clear();
    expect(useMealDraft.getState()).toMatchObject({ id: null, items: [] });
  });

  it('adds a dish from Search, replacing the same dish', () => {
    const { start, put } = useMealDraft.getState();
    start('meal-1', [{ dishId: 'rice', qty: 1 }, { dishId: 'chickenCurry', qty: 2 }]);
    put({ dishId: 'chickenCurry', qty: 4 });
    put({ dishId: 'clearSoup', qty: 1 });
    expect(useMealDraft.getState().items).toEqual([
      { dishId: 'rice', qty: 1 },
      { dishId: 'chickenCurry', qty: 4 },
      { dishId: 'clearSoup', qty: 1 },
    ]);
  });
});
