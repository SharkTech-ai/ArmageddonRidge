using ArmageddonRidge.Client;
using ArmageddonRidge.Client.Services;
using ArmageddonRidge.Client.Services.Rendering;
using ArmageddonRidge.Core.Content;
using ArmageddonRidge.Core.Game;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");

builder.Services.AddScoped(sp => new HttpClient { BaseAddress = new Uri(builder.HostEnvironment.BaseAddress) });
builder.Services.AddSingleton<WeaponCatalog>();
builder.Services.AddSingleton<UpgradeCatalog>();
builder.Services.AddScoped<GameEngine>();
builder.Services.AddScoped<CanvasRenderer>();
builder.Services.AddScoped<HybridCanvasRenderer>();
builder.Services.AddScoped<WasmCanvasRenderer>();
builder.Services.AddScoped<WasmRenderCommandBuilder>();
builder.Services.AddScoped<AudioService>();
builder.Services.AddScoped<BrowserStorage>();

await builder.Build().RunAsync();
