function PageHeader({
  title,
  description,
  action
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="break-words text-2xl font-bold text-gray-900">
          {title}
        </h1>

        {description && (
          <p className="mt-1 break-words text-sm text-gray-500">
            {description}
          </p>
        )}
      </div>

      {action && (
        <div className="shrink-0">
          {action}
        </div>
      )}
    </div>
  );
}

export default PageHeader;