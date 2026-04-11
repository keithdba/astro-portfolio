import { getErrorLogs, getErrorLogById, exportErrorLogsJSON } from './logs.service';
import { LogFilterSchema } from './logs.model';

function jsonResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function handleListErrorLogs(url: URL): Promise<Response> {
  const filterParams = {
    dateFrom: url.searchParams.get('dateFrom') || undefined,
    dateTo: url.searchParams.get('dateTo') || undefined,
    errorType: url.searchParams.get('errorType') || undefined,
    path: url.searchParams.get('path') || undefined,
    offset: parseInt(url.searchParams.get('offset') || '0', 10),
    limit: parseInt(url.searchParams.get('limit') || '50', 10),
  };

  const validated = LogFilterSchema.safeParse(filterParams);
  if (!validated.success) {
    return jsonResponse({ error: 'Invalid filter parameters', details: validated.error.issues }, 400);
  }

  const result = await getErrorLogs(validated.data);
  return jsonResponse(result);
}

export async function handleGetErrorLog(id: string): Promise<Response> {
  const log = await getErrorLogById(id);
  if (!log) {
    return jsonResponse({ error: 'Log not found' }, 404);
  }
  return jsonResponse(log);
}

export async function handleExportErrorLogs(): Promise<Response> {
  const data = await exportErrorLogsJSON();
  return new Response(data, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="error_logs_export.json"'
    }
  });
}
