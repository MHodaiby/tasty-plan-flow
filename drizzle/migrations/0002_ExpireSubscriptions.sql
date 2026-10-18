-- runs on every insert/update of subscriptions
IF NEW.end_date < CURRENT_DATE AND NEW.status IN ('active', 'paused') THEN
  NEW.status := 'expired';
END IF;
