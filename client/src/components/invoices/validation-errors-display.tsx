import { AlertTriangle, AlertCircle, XCircle, RefreshCw, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export interface ValidationError {
  id: number;
  invoiceId: number;
  errorCode: string;
  errorMessage: string;
  errorColor: 'Grey' | 'Yellow' | 'Red';
  requiresPreviousReceipt: boolean;
  createdAt: string;
}

interface ValidationErrorsDisplayProps {
  errors: ValidationError[];
  onResubmit?: () => void;
  onEdit?: () => void;
  isResubmitting?: boolean;
}

const getErrorIcon = (color: string) => {
  switch (color) {
    case 'Red':
      return <XCircle className="w-4 h-4 text-red-500" />;
    case 'Yellow':
      return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    case 'Grey':
      return <AlertCircle className="w-4 h-4 text-gray-500" />;
    default:
      return <AlertCircle className="w-4 h-4" />;
  }
};

const getErrorBadgeVariant = (color: string) => {
  switch (color) {
    case 'Red':
      return 'destructive';
    case 'Yellow':
      return 'secondary'; // Yellow/orange
    case 'Grey':
      return 'outline'; // Gray
    default:
      return 'outline';
  }
};

const getErrorDescription = (color: string) => {
  switch (color) {
    case 'Red':
      return 'Major validation error - fiscal day cannot be closed';
    case 'Yellow':
      return 'Minor validation error - fiscal day can still be closed';
    case 'Grey':
      return 'Receipt chain gap - waiting for previous receipt';
    default:
      return 'Validation error';
  }
};

export function ValidationErrorsDisplay({
  errors,
  onResubmit,
  onEdit,
  isResubmitting = false
}: ValidationErrorsDisplayProps) {
  if (!errors || errors.length === 0) {
    return null;
  }

  const hasRedErrors = errors.some(e => e.errorColor === 'Red');
  const hasGreyErrors = errors.some(e => e.errorColor === 'Grey');

  return (
    <Card className="border-red-200 bg-red-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-red-900">
          <AlertTriangle className="w-5 h-5" />
          Validation Errors
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Alert */}
        <Alert className={`${
          hasRedErrors
            ? 'border-red-200 bg-red-50'
            : hasGreyErrors
            ? 'border-gray-200 bg-gray-50'
            : 'border-yellow-200 bg-yellow-50'
        }`}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {hasRedErrors && "This receipt contains major validation errors that prevent fiscal day closure."}
            {hasGreyErrors && !hasRedErrors && "This receipt has missing previous receipts in the chain."}
            {!hasRedErrors && !hasGreyErrors && "This receipt contains minor validation errors."}
          </AlertDescription>
        </Alert>

        {/* Error List */}
        <div className="space-y-3">
          {errors.map((error) => (
            <div
              key={error.id}
              className="flex items-start gap-3 p-3 rounded-lg border bg-white"
            >
              {getErrorIcon(error.errorColor)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={getErrorBadgeVariant(error.errorColor) as any}>
                    {error.errorCode}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    {getErrorDescription(error.errorColor)}
                  </span>
                </div>
                <p className="text-sm text-gray-900 font-medium">
                  {error.errorMessage}
                </p>
                {error.requiresPreviousReceipt && (
                  <p className="text-xs text-gray-600 mt-1">
                    This error requires the previous receipt to be present in the chain.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        {(onResubmit || onEdit) && (
          <div className="flex gap-2 pt-2 border-t">
            {onResubmit && (
              <Button
                onClick={onResubmit}
                disabled={isResubmitting}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isResubmitting ? 'animate-spin' : ''}`} />
                {isResubmitting ? 'Resubmitting...' : 'Resubmit Receipt'}
              </Button>
            )}
            {onEdit && (
              <Button
                onClick={onEdit}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Edit & Fix
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}