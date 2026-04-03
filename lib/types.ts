export interface Event {
  id: string;
  name: string;
  slug: string;
  event_type: 'torneo' | 'cancha_abierta';
  status: string;
  description: string;
  start_date: string;
  end_date?: string;
  club_name: string;
  club_city: string;
  category_name?: string;
  public_registration_enabled: boolean;
  public_visible: boolean;
}
