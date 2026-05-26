CREATE INDEX IF NOT EXISTS processes_client_status_idx ON public.processes (client_id, status);
CREATE INDEX IF NOT EXISTS process_tasks_process_status_idx ON public.process_tasks (process_id, status);

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clients_touch_updated_at ON public.clients;
CREATE TRIGGER clients_touch_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS profiles_touch_updated_at ON public.profiles;
CREATE TRIGGER profiles_touch_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS processes_touch_updated_at ON public.processes;
CREATE TRIGGER processes_touch_updated_at
  BEFORE UPDATE ON public.processes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS process_tasks_touch_updated_at ON public.process_tasks;
CREATE TRIGGER process_tasks_touch_updated_at
  BEFORE UPDATE ON public.process_tasks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS appointments_touch_updated_at ON public.appointments;
CREATE TRIGGER appointments_touch_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
