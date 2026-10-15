begin;
set local role anon;
select public.focus_room('create','qatest02','qa-invite-secret-2026-10-15','qa-host-member-secret-2026-10-15','{"name":"Host"}');
select public.focus_room('join','qatest02','qa-invite-secret-2026-10-15','qa-guest-member-secret-2026-10-15','{"name":"Guest"}');
select public.focus_room('message','qatest02','qa-invite-secret-2026-10-15','qa-guest-member-secret-2026-10-15','{}','{"type":"message","text":"QA persistence"}');
do $$ declare r jsonb; guest text; begin
 r:=public.focus_room('snapshot','qatest02','qa-invite-secret-2026-10-15','qa-host-member-secret-2026-10-15');
 if jsonb_array_length(r->'messages')<>1 then raise exception 'QA history missing';end if;
 begin perform public.focus_room('lock','qatest02','qa-invite-secret-2026-10-15','qa-guest-member-secret-2026-10-15','{}','{"locked":true}');raise exception 'QA guest locked room';exception when raise_exception then if SQLERRM<>'Host required' then raise;end if;end;
 begin perform public.focus_room('timer','qatest02','qa-invite-secret-2026-10-15','qa-guest-member-secret-2026-10-15','{}','{"mode":"focus","isActive":false,"remainingMs":1000}');raise exception 'QA guest changed timer';exception when raise_exception then if SQLERRM<>'Host required' then raise;end if;end;
 guest:=encode(sha256(convert_to('qa-guest-member-secret-2026-10-15','UTF8')),'hex');
 perform public.focus_room('kick','qatest02','qa-invite-secret-2026-10-15','qa-host-member-secret-2026-10-15','{}',jsonb_build_object('targetId',guest));
 begin perform public.focus_room('snapshot','qatest02','qa-invite-secret-2026-10-15','qa-guest-member-secret-2026-10-15');raise exception 'QA removed guest admitted';exception when raise_exception then if SQLERRM<>'Removed from this room' then raise;end if;end;
end $$;
rollback;
