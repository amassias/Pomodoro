// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import CitySelector from './CitySelector';
const data = vi.hoisted(() => ({ toggleFavorite:vi.fn(), addCustomLocation:vi.fn().mockReturnValue('custom_new') }));
vi.mock('../../providers/UserDataProvider.jsx',()=>({useUserData:()=>({favoriteCities:[],toggleFavorite:data.toggleFavorite,addCustomLocation:data.addCustomLocation,removeCustomLocation:vi.fn(),settings:{},setSettings:vi.fn()})}));
expect.extend(toHaveNoViolations);
afterEach(cleanup);
it('keeps favorites keyboard accessible and validates a custom location', async () => {
  const user=userEvent.setup(), select=vi.fn();
  render(<CitySelector currentCity="tokyo" cities={{tokyo:{name:'Tokyo',category:'Urban Night',id:'abcdefghijk'}}} onSelect={select} />);
  await user.click(screen.getByRole('button',{name:/Studying in Tokyo/}));
  const favorite=await screen.findByRole('button',{name:'Add Tokyo to favorites'});
  favorite.focus(); await user.keyboard(' ');
  expect(data.toggleFavorite).toHaveBeenCalledWith('tokyo');
  expect(select).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button',{name:/Add your own YouTube stream/}));
  const dialog=await screen.findByRole('dialog',{name:'Add Custom Location'});
  expect(await axe(dialog)).toHaveNoViolations();
  await user.type(within(dialog).getByLabelText('Location Name'),'Cafe');
  await user.type(within(dialog).getByLabelText('YouTube URL or Video ID'),'https://youtu.be/abcdefghijk');
  await user.click(within(dialog).getByRole('button',{name:'Add Location'}));
  expect(data.addCustomLocation).toHaveBeenCalledWith('Cafe','abcdefghijk');
  expect(select).toHaveBeenCalledWith('custom_new');
});
