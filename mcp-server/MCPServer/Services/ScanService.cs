using MCPServer.Models;
using MCPServer.Models.DTOs;
using MongoDB.Driver;

namespace MCPServer.Services;

public class ScanService : IScanService
{
    private readonly IMongoCollection<ScanRequest> _scanRequestsCollection;
    private readonly IMongoCollection<ScanResult> _scanResultsCollection;

    public ScanService(IMongoClient mongoClient, MongoDbSettings settings)
    {
        var database = mongoClient.GetDatabase(settings.DatabaseName);
        _scanRequestsCollection = database.GetCollection<ScanRequest>("ScanRequests");
        _scanResultsCollection = database.GetCollection<ScanResult>("ScanResults");
    }

    public async Task<List<ScanRequest>> GetAllScanRequestsAsync()
    {
        return await _scanRequestsCollection.Find(_ => true).ToListAsync();
    }

    public async Task<ScanRequest?> GetScanRequestByIdAsync(string id)
    {
        return await _scanRequestsCollection.Find(s => s.Id == id).FirstOrDefaultAsync();
    }

    public async Task<ScanRequest> CreateScanRequestAsync(ScanRequestDto scanRequestDto)
    {
        var scanRequest = new ScanRequest
        {
            RepositoryUrl = scanRequestDto.RepositoryUrl,
            Branch = scanRequestDto.Branch,
            AgentId = scanRequestDto.AgentId,
            RequestedAt = DateTime.UtcNow,
            Status = "Pending"
        };

        await _scanRequestsCollection.InsertOneAsync(scanRequest);
        return scanRequest;
    }

    public async Task<bool> UpdateScanRequestStatusAsync(string id, string status)
    {
        var update = Builders<ScanRequest>.Update.Set(s => s.Status, status);
        var result = await _scanRequestsCollection.UpdateOneAsync(s => s.Id == id, update);
        return result.ModifiedCount > 0;
    }

    public async Task<List<ScanResult>> GetAllScanResultsAsync()
    {
        return await _scanResultsCollection.Find(_ => true).ToListAsync();
    }

    public async Task<ScanResult?> GetScanResultByIdAsync(string id)
    {
        return await _scanResultsCollection.Find(s => s.Id == id).FirstOrDefaultAsync();
    }

    public async Task<ScanResult?> GetScanResultByScanRequestIdAsync(string scanRequestId)
    {
        return await _scanResultsCollection.Find(s => s.ScanRequestId == scanRequestId).FirstOrDefaultAsync();
    }

    public async Task<ScanResult> SubmitScanResultAsync(ScanResultSubmissionDto scanResultDto)
    {
        // Update scan request status
        await UpdateScanRequestStatusAsync(scanResultDto.ScanRequestId, "Completed");

        // Create scan result
        var findings = scanResultDto.Findings.Select(f => new Finding
        {
            RuleId = f.RuleId,
            Severity = f.Severity,
            FilePath = f.FilePath,
            LineNumber = f.LineNumber,
            Description = f.Description,
            CodeSnippet = f.CodeSnippet,
            Recommendation = f.Recommendation
        }).ToList();

        var scanResult = new ScanResult
        {
            ScanRequestId = scanResultDto.ScanRequestId,
            AgentId = scanResultDto.AgentId,
            CompletedAt = DateTime.UtcNow,
            Findings = findings,
            Summary = scanResultDto.Summary
        };

        await _scanResultsCollection.InsertOneAsync(scanResult);
        return scanResult;
    }
} 